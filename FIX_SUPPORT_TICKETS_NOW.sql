-- Run this SQL in your Supabase SQL Editor to fix support tickets immediately
-- This enables RLS and adds the necessary policies

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can add messages to own tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can add messages to any ticket" ON ticket_messages;

-- Support Tickets Policies
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets"
    ON support_tickets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

-- Ticket Messages Policies
CREATE POLICY "Users can view own ticket messages"
    ON ticket_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM support_tickets
        WHERE support_tickets.id = ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    ));

CREATE POLICY "Admins can view all ticket messages"
    ON ticket_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Users can add messages to own tickets"
    ON ticket_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM support_tickets
        WHERE support_tickets.id = ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    ));

CREATE POLICY "Admins can add messages to any ticket"
    ON ticket_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_support_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_message TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket TO authenticated;

-- Verify it worked
SELECT 'Support tickets RLS policies created successfully!' as status;
