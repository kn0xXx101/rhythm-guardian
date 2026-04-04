-- Fix Support Tickets RLS Policies
-- Enable RLS and add proper policies for support tickets and ticket messages

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Support Tickets Policies
-- ============================================================================

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can create their own tickets (via function)
CREATE POLICY "Users can create tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can update tickets
CREATE POLICY "Admins can update tickets"
    ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- Ticket Messages Policies
-- ============================================================================

-- Users can view messages in their own tickets
CREATE POLICY "Users can view own ticket messages"
    ON ticket_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

-- Admins can view all ticket messages
CREATE POLICY "Admins can view all ticket messages"
    ON ticket_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can add messages to their own tickets
CREATE POLICY "Users can add messages to own tickets"
    ON ticket_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

-- Admins can add messages to any ticket
CREATE POLICY "Admins can add messages to any ticket"
    ON ticket_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

-- Allow authenticated users to call create_support_ticket
GRANT EXECUTE ON FUNCTION create_support_ticket TO authenticated;

-- Allow authenticated users to call add_ticket_message
GRANT EXECUTE ON FUNCTION add_ticket_message TO authenticated;

-- Allow authenticated users to call resolve_ticket
GRANT EXECUTE ON FUNCTION resolve_ticket TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can view own tickets" ON support_tickets IS 'Users can view their own support tickets';
COMMENT ON POLICY "Admins can view all tickets" ON support_tickets IS 'Admins can view all support tickets';
COMMENT ON POLICY "Users can create tickets" ON support_tickets IS 'Users can create support tickets';
COMMENT ON POLICY "Admins can update tickets" ON support_tickets IS 'Admins can update ticket status and details';
