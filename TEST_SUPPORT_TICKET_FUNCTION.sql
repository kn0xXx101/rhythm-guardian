-- Test the create_support_ticket function to see what's failing

-- First, check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'create_support_ticket';

-- Check current user and their role
SELECT 
    auth.uid() as current_user_id,
    p.role,
    p.full_name
FROM profiles p
WHERE p.user_id = auth.uid();

-- Try to create a test ticket (replace YOUR_USER_ID with actual user ID)
-- SELECT create_support_ticket(
--     'YOUR_USER_ID'::uuid,
--     'Test Support Request',
--     'This is a test message',
--     'general',
--     'medium'
-- );

-- Check if there are any existing tickets
SELECT COUNT(*) as ticket_count FROM support_tickets;

-- Check RLS policies on support_tickets
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'support_tickets';

-- Check grants on the function
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'create_support_ticket';
