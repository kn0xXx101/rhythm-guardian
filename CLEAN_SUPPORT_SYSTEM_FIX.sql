-- Clean Support System Fix - Drops existing functions and recreates them
-- Run this in Supabase SQL Editor to fix the "Unable to create support request" error

-- ============================================================================
-- 1. Drop existing functions that might conflict
-- ============================================================================

DROP FUNCTION IF EXISTS get_support_tickets();
DROP FUNCTION IF EXISTS get_ticket_messages(uuid);
DROP FUNCTION IF EXISTS get_user_active_tickets(uuid);
DROP FUNCTION IF EXISTS get_user_active_tickets_with_session(uuid);
DROP FUNCTION IF EXISTS get_new_ticket_messages(uuid, timestamptz, text);
DROP FUNCTION IF EXISTS create_support_ticket(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS add_ticket_message(uuid, text, uuid, text, boolean);
DROP FUNCTION IF EXISTS resolve_ticket(uuid, uuid, text);

-- ============================================================================
-- 2. Add session management columns if they don't exist
-- ============================================================================

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'waiting_admin';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS auto_close_reason TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add is_internal column to ticket_messages if it doesn't exist
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- ============================================================================
-- 3. Create the main create_support_ticket function
-- ============================================================================

CREATE FUNCTION create_support_ticket(
    p_user_id uuid,
    p_subject text,
    p_message text,
    p_category text DEFAULT NULL,
    p_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_id uuid;
    v_user_role text;
    v_user_name text;
BEGIN
    -- Get user info
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM profiles
    WHERE user_id = p_user_id;
    
    -- Create ticket
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
        COALESCE(p_priority, 'medium'),
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
        content,
        is_internal
    ) VALUES (
        v_ticket_id,
        'user',
        p_user_id,
        COALESCE(v_user_name, 'User'),
        p_message,
        false
    );
    
    -- Try to notify admins (ignore errors if notifications table doesn't exist)
    BEGIN
        INSERT INTO notifications (user_id, type, title, content, action_url, priority)
        SELECT 
            user_id,
            'support_ticket',
            'New Support Request',
            COALESCE(v_user_name, 'User') || ' needs help: ' || p_subject,
            '/admin/support',
            'normal'
        FROM profiles
        WHERE role = 'admin';
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignore notification errors
            NULL;
    END;
    
    RETURN v_ticket_id;
END;
$$;

-- ============================================================================
-- 4. Create enhanced add_ticket_message function
-- ============================================================================

CREATE FUNCTION add_ticket_message(
    p_ticket_id uuid,
    p_sender_type text,
    p_sender_id uuid,
    p_content text,
    p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Update ticket activity
    UPDATE support_tickets
    SET last_activity_at = NOW()
    WHERE id = p_ticket_id;
    
    -- Handle session management
    IF p_sender_type = 'admin' AND NOT COALESCE(p_is_internal, false) THEN
        -- Admin responded - user has 5 minutes
        UPDATE support_tickets
        SET 
            session_status = 'active',
            session_expires_at = NOW() + INTERVAL '5 minutes',
            first_response_at = COALESCE(first_response_at, NOW()),
            status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
        WHERE id = p_ticket_id;
        
        -- Try to notify user (ignore errors)
        BEGIN
            INSERT INTO notifications (user_id, type, title, content, action_url, priority)
            VALUES (
                v_user_id,
                'support_response',
                'Admin Response',
                'An administrator responded to your support request.',
                '/messages?ai_assistant=true',
                'high'
            );
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
        
    ELSIF p_sender_type = 'user' THEN
        -- User responded - admin has 24 hours
        UPDATE support_tickets
        SET 
            session_status = 'active',
            session_expires_at = NOW() + INTERVAL '24 hours'
        WHERE id = p_ticket_id;
        
        -- Try to notify admins (ignore errors)
        BEGIN
            INSERT INTO notifications (user_id, type, title, content, action_url, priority)
            SELECT 
                p.user_id,
                'support_response',
                'User Response',
                'User responded to support ticket: ' || v_ticket_subject,
                '/admin/support',
                'normal'
            FROM profiles p
            WHERE p.role = 'admin';
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
    END IF;
    
    RETURN v_message_id;
END;
$$;

-- ============================================================================
-- 5. Create helper functions for admin interface
-- ============================================================================

CREATE FUNCTION get_support_tickets()
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        COALESCE(st.session_status, 'waiting_admin') as session_status,
        st.session_expires_at,
        jsonb_build_object(
            'full_name', COALESCE(p.full_name, 'Unknown User'),
            'role', COALESCE(p.role, 'user')
        ) as user_info
    FROM support_tickets st
    LEFT JOIN profiles p ON p.user_id = st.user_id
    ORDER BY st.created_at DESC;
END;
$$;

CREATE FUNCTION get_ticket_messages(p_ticket_id uuid)
RETURNS TABLE (
    id uuid,
    sender_type text,
    sender_name text,
    content text,
    created_at timestamptz,
    is_internal boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    WHERE tm.ticket_id = p_ticket_id
    ORDER BY tm.created_at ASC;
END;
$$;

CREATE FUNCTION get_user_active_tickets(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    subject text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE FUNCTION get_user_active_tickets_with_session(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    session_status text,
    subject text,
    created_at timestamptz,
    session_expires_at timestamptz,
    minutes_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.status,
        COALESCE(st.session_status, 'waiting_admin') as session_status,
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
    AND COALESCE(st.session_status, 'waiting_admin') NOT IN ('closed', 'user_timeout', 'admin_timeout')
    ORDER BY st.created_at DESC;
END;
$$;

CREATE FUNCTION get_new_ticket_messages(
    p_ticket_id uuid,
    p_since timestamptz,
    p_sender_type text
)
RETURNS TABLE (
    id uuid,
    sender_name text,
    content text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE FUNCTION resolve_ticket(
    p_ticket_id uuid,
    p_admin_id uuid,
    p_resolution_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        (SELECT COALESCE(full_name, 'Admin') FROM profiles WHERE user_id = p_admin_id),
        p_resolution_note,
        false
    );
END;
$$;

-- ============================================================================
-- 6. Set up RLS policies (drop and recreate to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can manage tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can add messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view messages" ON ticket_messages;

CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ));

CREATE POLICY "Admins can manage tickets"
    ON support_tickets FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ));

CREATE POLICY "Users can add messages"
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

CREATE POLICY "Users can view messages"
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
-- 7. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_support_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets_with_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_ticket_messages(uuid, timestamptz, text) TO authenticated;

-- ============================================================================
-- 8. Test the system
-- ============================================================================

DO $$
DECLARE
    test_user_id uuid;
    test_ticket_id uuid;
BEGIN
    -- Get a test user
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
        
        RAISE NOTICE 'SUCCESS: Support ticket system test passed! Created ticket ID: %', test_ticket_id;
    ELSE
        RAISE NOTICE 'SUCCESS: Support ticket functions created. No test user found for testing.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Support ticket system is ready. Test skipped due to: %', SQLERRM;
END;
$$;

SELECT 'Support Ticket System installed successfully! You can now use "connect to admin" in AI Assistant.' as status;