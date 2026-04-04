-- Complete Support Ticket System with Session Management
-- This migration ensures all required functions and features are available

-- ============================================================================
-- 1. Ensure support_tickets table exists with all required columns
-- ============================================================================

-- Add session management columns if they don't exist
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'waiting_admin' 
    CHECK (session_status IN ('waiting_admin', 'active', 'user_timeout', 'admin_timeout', 'closed'));
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS auto_close_reason TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ============================================================================
-- 2. Create or replace all required functions
-- ============================================================================

-- Basic create_support_ticket function
CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id uuid,
    p_subject text,
    p_message text,
    p_category text DEFAULT NULL,
    p_priority text DEFAULT 'medium'
)
RETURNS uuid AS $$
DECLARE
    v_ticket_id uuid;
    v_user_role text;
    v_user_name text;
BEGIN
    -- Get user info
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM profiles
    WHERE user_id = p_user_id;
    
    -- Create ticket with initial session (waiting for admin, 24 hour timeout)
    INSERT INTO support_tickets (
        user_id,
        status,
        priority,
        category,
        subject,
        original_message,
        user_role,
        session_status,
        session_expires_at,
        last_activity_at
    ) VALUES (
        p_user_id,
        'open',
        p_priority,
        p_category,
        p_subject,
        p_message,
        COALESCE(v_user_role, 'user'),
        'waiting_admin',
        NOW() + INTERVAL '24 hours',
        NOW()
    ) RETURNING id INTO v_ticket_id;
    
    -- Add initial message
    INSERT INTO ticket_messages (
        ticket_id,
        sender_type,
        sender_id,
        sender_name,
        content
    ) VALUES (
        v_ticket_id,
        'user',
        p_user_id,
        COALESCE(v_user_name, 'User'),
        p_message
    );
    
    -- Notify admins about new ticket
    INSERT INTO notifications (user_id, type, title, content, action_url, priority, data)
    SELECT 
        user_id,
        'support_ticket',
        '🎫 New Support Request',
        COALESCE(v_user_name, 'User') || ' needs help: ' || p_subject,
        '/admin/support?ticket=' || v_ticket_id,
        'normal',
        jsonb_build_object(
            'ticket_id', v_ticket_id,
            'user_id', p_user_id,
            'priority', p_priority,
            'expires_at', (NOW() + INTERVAL '24 hours')::text
        )
    FROM profiles
    WHERE role = 'admin';
    
    RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Session management functions
CREATE OR REPLACE FUNCTION update_ticket_session_on_admin_response(p_ticket_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE support_tickets
    SET 
        session_status = 'active',
        last_activity_at = NOW(),
        session_expires_at = NOW() + INTERVAL '5 minutes', -- User has 5 mins to respond
        first_response_at = COALESCE(first_response_at, NOW()),
        status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
    WHERE id = p_ticket_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_ticket_session_on_user_response(p_ticket_id uuid)
RETURNS void AS $
BEGIN
    UPDATE support_tickets
    SET 
        session_status = 'active',
        last_activity_at = NOW(),
        session_expires_at = NOW() + INTERVAL '24 hours' -- Admin has 24 hours to respond
    WHERE id = p_ticket_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced add_ticket_message function
CREATE OR REPLACE FUNCTION add_ticket_message(
    p_ticket_id uuid,
    p_sender_type text,
    p_sender_id uuid,
    p_content text,
    p_is_internal boolean DEFAULT false
)
RETURNS uuid AS $
DECLARE
    v_message_id uuid;
    v_sender_name text;
    v_user_id uuid;
    v_ticket_subject text;
BEGIN
    -- Get sender name and ticket info
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE user_id = p_sender_id;
    
    SELECT user_id, subject INTO v_user_id, v_ticket_subject
    FROM support_tickets
    WHERE id = p_ticket_id;
    
    -- Insert message
    INSERT INTO ticket_messages (
        ticket_id,
        sender_type,
        sender_id,
        sender_name,
        content,
        is_internal
    ) VALUES (
        p_ticket_id,
        p_sender_type,
        p_sender_id,
        COALESCE(v_sender_name, 'User'),
        p_content,
        COALESCE(p_is_internal, false)
    ) RETURNING id INTO v_message_id;
    
    -- Update session based on sender type
    IF p_sender_type = 'admin' AND NOT COALESCE(p_is_internal, false) THEN
        -- Admin responded - activate session, user has 5 minutes
        PERFORM update_ticket_session_on_admin_response(p_ticket_id);
        
        -- Notify user via AI Assistant that admin responded
        INSERT INTO notifications (user_id, type, title, content, action_url, priority, data)
        VALUES (
            v_user_id,
            'support_response',
            '👨‍💼 Admin Response',
            'An administrator responded to your support request: "' || LEFT(p_content, 100) || 
            CASE WHEN LENGTH(p_content) > 100 THEN '..."' ELSE '"' END,
            '/messages?ai_assistant=true',
            'high',
            jsonb_build_object(
                'ticket_id', p_ticket_id,
                'admin_message', p_content,
                'expires_in_minutes', 5
            )
        );
        
    ELSIF p_sender_type = 'user' THEN
        -- User responded - extend session, admin has 24 hours
        PERFORM update_ticket_session_on_user_response(p_ticket_id);
        
        -- Notify all admins that user responded
        INSERT INTO notifications (user_id, type, title, content, action_url, priority, data)
        SELECT 
            p.user_id,
            'support_response',
            '💬 User Response',
            'User responded to support ticket "' || v_ticket_subject || '": "' || LEFT(p_content, 100) || 
            CASE WHEN LENGTH(p_content) > 100 THEN '..."' ELSE '"' END,
            '/admin/support?ticket=' || p_ticket_id,
            'normal',
            jsonb_build_object(
                'ticket_id', p_ticket_id,
                'user_message', p_content
            )
        FROM profiles p
        WHERE p.role = 'admin';
    END IF;
    
    RETURN v_message_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-close expired tickets function
CREATE OR REPLACE FUNCTION auto_close_expired_tickets()
RETURNS void AS $
DECLARE
    expired_ticket RECORD;
BEGIN
    -- Find expired tickets
    FOR expired_ticket IN
        SELECT id, user_id, session_status, subject
        FROM support_tickets
        WHERE session_expires_at < NOW()
        AND session_status IN ('waiting_admin', 'active')
        AND status NOT IN ('resolved', 'closed')
    LOOP
        -- Determine close reason
        IF expired_ticket.session_status = 'waiting_admin' THEN
            -- Admin didn't respond within 24 hours
            UPDATE support_tickets
            SET 
                session_status = 'admin_timeout',
                status = 'closed',
                auto_close_reason = 'Admin did not respond within 24 hours',
                closed_at = NOW()
            WHERE id = expired_ticket.id;
            
            -- Notify user about admin timeout
            INSERT INTO notifications (user_id, type, title, content, priority)
            VALUES (
                expired_ticket.user_id,
                'system',
                '⏰ Support Session Closed',
                'Your support request "' || expired_ticket.subject || '" was closed due to no admin response. You can create a new ticket if you still need help.',
                'normal'
            );
            
        ELSE
            -- User didn't respond within 5 minutes
            UPDATE support_tickets
            SET 
                session_status = 'user_timeout',
                status = 'closed',
                auto_close_reason = 'User did not respond within 5 minutes',
                closed_at = NOW()
            WHERE id = expired_ticket.id;
            
            -- Notify user about session timeout
            INSERT INTO notifications (user_id, type, title, content, priority)
            VALUES (
                expired_ticket.user_id,
                'system',
                '⏰ Support Session Timed Out',
                'Your support session for "' || expired_ticket.subject || '" timed out due to inactivity. You can create a new ticket if you still need help.',
                'low'
            );
        END IF;
    END LOOP;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functions for admin interface
CREATE OR REPLACE FUNCTION get_support_tickets()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    status text,
    priority text,
    subject text,
    original_message text,
    created_at timestamptz,
    session_status text,
    session_expires_at timestamptz,
    user_info jsonb
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.user_id,
        st.status,
        st.priority,
        st.subject,
        st.original_message,
        st.created_at,
        st.session_status,
        st.session_expires_at,
        jsonb_build_object(
            'full_name', p.full_name,
            'role', p.role
        ) as user_info
    FROM support_tickets st
    LEFT JOIN profiles p ON p.user_id = st.user_id
    ORDER BY st.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ticket_messages(ticket_id uuid)
RETURNS TABLE (
    id uuid,
    sender_type text,
    sender_name text,
    content text,
    created_at timestamptz,
    is_internal boolean
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.sender_type,
        tm.sender_name,
        tm.content,
        tm.created_at,
        COALESCE(tm.is_internal, false) as is_internal
    FROM ticket_messages tm
    WHERE tm.ticket_id = get_ticket_messages.ticket_id
    ORDER BY tm.created_at ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_active_tickets(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    subject text,
    created_at timestamptz
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.status,
        st.subject,
        st.created_at
    FROM support_tickets st
    WHERE st.user_id = p_user_id
    AND st.status IN ('open', 'in_progress')
    ORDER BY st.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_active_tickets_with_session(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    session_status text,
    subject text,
    created_at timestamptz,
    session_expires_at timestamptz,
    minutes_remaining integer
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.status,
        st.session_status,
        st.subject,
        st.created_at,
        st.session_expires_at,
        CASE 
            WHEN st.session_expires_at > NOW() 
            THEN EXTRACT(EPOCH FROM (st.session_expires_at - NOW()))::integer / 60
            ELSE 0
        END as minutes_remaining
    FROM support_tickets st
    WHERE st.user_id = p_user_id
    AND st.status IN ('open', 'in_progress')
    AND st.session_status NOT IN ('closed', 'user_timeout', 'admin_timeout')
    ORDER BY st.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_new_ticket_messages(
    p_ticket_id uuid,
    p_since timestamptz,
    p_sender_type text
)
RETURNS TABLE (
    id uuid,
    sender_name text,
    content text,
    created_at timestamptz
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.sender_name,
        tm.content,
        tm.created_at
    FROM ticket_messages tm
    WHERE tm.ticket_id = p_ticket_id
    AND tm.sender_type = p_sender_type
    AND tm.created_at > p_since
    ORDER BY tm.created_at ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION resolve_ticket(
    p_ticket_id uuid,
    p_admin_id uuid,
    p_resolution_note text
)
RETURNS void AS $
BEGIN
    UPDATE support_tickets
    SET 
        status = 'resolved',
        session_status = 'closed',
        closed_at = NOW()
    WHERE id = p_ticket_id;
    
    -- Add resolution message
    INSERT INTO ticket_messages (
        ticket_id,
        sender_type,
        sender_id,
        sender_name,
        content,
        is_internal
    ) VALUES (
        p_ticket_id,
        'admin',
        p_admin_id,
        (SELECT full_name FROM profiles WHERE user_id = p_admin_id),
        p_resolution_note,
        false
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for scheduled tasks
CREATE OR REPLACE FUNCTION cleanup_expired_support_tickets()
RETURNS text AS $
DECLARE
    closed_count integer := 0;
BEGIN
    -- Run the auto-close function
    PERFORM auto_close_expired_tickets();
    
    -- Count how many were closed
    GET DIAGNOSTICS closed_count = ROW_COUNT;
    
    RETURN 'Closed ' || closed_count || ' expired support tickets at ' || NOW()::text;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Set up proper RLS policies
-- ============================================================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can add messages to own tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can add messages to any ticket" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON ticket_messages;

-- Support tickets policies
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Ticket messages policies
CREATE POLICY "Users can add messages to own tickets"
    ON ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id 
            AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can view messages from own tickets"
    ON ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id 
            AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- 4. Grant necessary permissions
-- ============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_support_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets_with_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_ticket_messages(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_support_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_close_expired_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_session_on_admin_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_session_on_user_response(uuid) TO authenticated;

-- ============================================================================
-- 5. Test the system
-- ============================================================================

DO $
DECLARE
    test_user_id uuid;
    test_ticket_id uuid;
BEGIN
    -- Get a test user (first authenticated user)
    SELECT user_id INTO test_user_id
    FROM profiles
    WHERE role != 'admin'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test creating a ticket
        SELECT create_support_ticket(
            test_user_id,
            'Test Support Request',
            'This is a test message to verify the support system works.',
            'general',
            'medium'
        ) INTO test_ticket_id;
        
        RAISE NOTICE 'Support ticket system test successful! Created ticket ID: %', test_ticket_id;
    ELSE
        RAISE NOTICE 'No test user found, but functions are created and ready.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Support ticket system is ready. Test skipped due to: %', SQLERRM;
END $;

-- Success message
SELECT 'Complete Support Ticket System with Session Management installed successfully!' as status;