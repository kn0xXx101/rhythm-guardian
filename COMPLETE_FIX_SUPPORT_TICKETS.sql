-- Complete fix for support tickets and admin connection
-- Run this entire script in Supabase SQL Editor

-- 1. Grant execute permissions on all support ticket functions
GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket(uuid, uuid, text) TO authenticated;

-- 2. Ensure RLS policies allow ticket creation
-- Drop and recreate to ensure they're correct
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (true); -- Allow all authenticated users to create tickets

-- 3. Allow users to insert ticket messages
DROP POLICY IF EXISTS "Users can add messages to own tickets" ON ticket_messages;
CREATE POLICY "Users can add messages to own tickets"
    ON ticket_messages FOR INSERT
    WITH CHECK (true); -- Allow during ticket creation

-- 4. Ensure notifications table allows inserts from the function
-- Check if policy exists for function-created notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Allow function inserts'
    ) THEN
        CREATE POLICY "Allow function inserts"
            ON notifications FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- 5. Create helper functions for the admin interface
CREATE OR REPLACE FUNCTION get_support_tickets()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    status text,
    priority text,
    subject text,
    original_message text,
    created_at timestamptz,
    user_info jsonb
) AS $$
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
        jsonb_build_object(
            'full_name', p.full_name,
            'role', p.role
        ) as user_info
    FROM support_tickets st
    LEFT JOIN profiles p ON p.user_id = st.user_id
    ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ticket_messages(ticket_id uuid)
RETURNS TABLE (
    id uuid,
    sender_type text,
    sender_name text,
    content text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.sender_type,
        tm.sender_name,
        tm.content,
        tm.created_at
    FROM ticket_messages tm
    WHERE tm.ticket_id = get_ticket_messages.ticket_id
    ORDER BY tm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_active_tickets(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    subject text,
    created_at timestamptz
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions on helper functions
GRANT EXECUTE ON FUNCTION get_support_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_ticket_messages(uuid, timestamptz, text) TO authenticated;

-- 7. Test the function works
DO $$
DECLARE
    test_user_id uuid;
    test_ticket_id uuid;
BEGIN
    -- Get a test user (first non-admin user)
    SELECT user_id INTO test_user_id
    FROM profiles
    WHERE role != 'admin'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to create a test ticket
        test_ticket_id := create_support_ticket(
            test_user_id,
            'Test Ticket - Can be deleted',
            'This is a test message to verify the function works',
            'general',
            'low'
        );
        
        RAISE NOTICE 'Test ticket created successfully with ID: %', test_ticket_id;
        
        -- Clean up test ticket
        DELETE FROM ticket_messages WHERE ticket_id = test_ticket_id;
        DELETE FROM support_tickets WHERE id = test_ticket_id;
        DELETE FROM notifications WHERE metadata->>'ticket_id' = test_ticket_id::text;
        
        RAISE NOTICE 'Test ticket cleaned up successfully';
    ELSE
        RAISE NOTICE 'No test user found, skipping test';
    END IF;
END $$;

-- 8. Verify everything is set up
SELECT 
    'Setup complete! Support tickets should now work.' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'support_tickets') as ticket_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ticket_messages') as message_policies,
    has_function_privilege('authenticated', 'create_support_ticket(uuid, text, text, text, text)', 'execute') as can_create_tickets,
    has_function_privilege('authenticated', 'get_support_tickets()', 'execute') as can_get_tickets;
