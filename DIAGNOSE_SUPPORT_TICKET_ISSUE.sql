-- Quick diagnostic to find the issue with support tickets

-- 1. Check if function exists and has correct signature
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_support_ticket'
AND n.nspname = 'public';

-- 2. Check if authenticated role has execute permission
SELECT 
    has_function_privilege('authenticated', 'create_support_ticket(uuid, text, text, text, text)', 'execute') as can_execute;

-- 3. Grant permission if missing
GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, text, text) TO anon;

-- 4. Also grant on other functions
GRANT EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket(uuid, uuid, text) TO authenticated;

-- 5. Verify grants worked
SELECT 'Permissions granted successfully!' as status;

-- 6. Check if tables exist and RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('support_tickets', 'ticket_messages')
AND schemaname = 'public';
