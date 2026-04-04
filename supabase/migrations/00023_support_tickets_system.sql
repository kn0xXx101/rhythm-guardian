-- Support Tickets System for AI Assistant ↔ Admin Communication
-- Users chat with AI Assistant, which escalates to admins via tickets

-- ============================================================================
-- Support Tickets Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    
    -- Ticket details
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT,
    subject TEXT NOT NULL,
    original_message TEXT NOT NULL,
    
    -- Metadata
    user_role TEXT, -- musician or hirer
    related_booking_id UUID REFERENCES bookings(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- ============================================================================
-- Ticket Messages Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    -- Sender info
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'ai', 'system')),
    sender_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    sender_name TEXT, -- Cached for display
    
    -- Message content
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Admin-only notes
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin ON support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON ticket_messages(sender_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update ticket updated_at
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Create support ticket from AI escalation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_subject TEXT,
    p_message TEXT,
    p_category TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    v_ticket_id UUID;
    v_user_role TEXT;
    v_user_name TEXT;
    v_admin_id UUID;
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
        user_role
    ) VALUES (
        p_user_id,
        'open',
        p_priority,
        p_category,
        p_subject,
        p_message,
        v_user_role
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
        v_user_name,
        p_message
    );
    
    -- Notify admins directly (without using notify_admins function to avoid type issues)
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
    SELECT 
        user_id,
        'system',
        '🎫 New Support Ticket',
        v_user_name || ' needs help: ' || p_subject,
        '/admin/support?ticket=' || v_ticket_id,
        jsonb_build_object(
            'ticket_id', v_ticket_id,
            'user_id', p_user_id,
            'priority', p_priority
        )
    FROM profiles
    WHERE role = 'admin';
    
    RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Add message to ticket
-- ============================================================================

CREATE OR REPLACE FUNCTION add_ticket_message(
    p_ticket_id UUID,
    p_sender_type TEXT,
    p_sender_id UUID,
    p_content TEXT,
    p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_sender_name TEXT;
    v_user_id UUID;
BEGIN
    -- Get sender name
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE user_id = p_sender_id;
    
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
        v_sender_name,
        p_content,
        p_is_internal
    ) RETURNING id INTO v_message_id;
    
    -- Update ticket
    UPDATE support_tickets
    SET updated_at = NOW(),
        first_response_at = CASE 
            WHEN first_response_at IS NULL AND p_sender_type = 'admin' 
            THEN NOW() 
            ELSE first_response_at 
        END,
        status = CASE 
            WHEN status = 'open' AND p_sender_type = 'admin' 
            THEN 'in_progress' 
            ELSE status 
        END
    WHERE id = p_ticket_id;
    
    -- If admin responded, notify user via AI Assistant
    IF p_sender_type = 'admin' AND NOT p_is_internal THEN
        SELECT user_id INTO v_user_id
        FROM support_tickets
        WHERE id = p_ticket_id;
        
        -- This will be handled by the AI Assistant service
        -- to relay the message to the user
    END IF;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Resolve ticket
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_ticket(
    p_ticket_id UUID,
    p_admin_id UUID,
    p_resolution_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE support_tickets
    SET status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_ticket_id;
    
    -- Add resolution note if provided
    IF p_resolution_note IS NOT NULL THEN
        PERFORM add_ticket_message(
            p_ticket_id,
            'system',
            p_admin_id,
            'Ticket resolved: ' || p_resolution_note,
            TRUE
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE support_tickets IS 'Support tickets for AI Assistant escalations to admins';
COMMENT ON TABLE ticket_messages IS 'Messages within support tickets (user, admin, AI, system)';
COMMENT ON FUNCTION create_support_ticket IS 'Creates a new support ticket when AI Assistant escalates to admin';
COMMENT ON FUNCTION add_ticket_message IS 'Adds a message to an existing ticket';
COMMENT ON FUNCTION resolve_ticket IS 'Marks a ticket as resolved';
