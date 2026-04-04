-- Complete trace of admin message flow
-- Run this to understand what's happening

-- 1. Find admin user
SELECT 'ADMIN USER' as step, user_id, full_name, email, role 
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;

-- 2. Find a regular user (to test with)
SELECT 'REGULAR USER' as step, user_id, full_name, email, role 
FROM profiles 
WHERE role != 'admin' 
LIMIT 1;

-- 3. Check recent messages FROM admin
SELECT 
    'MESSAGES FROM ADMIN' as step,
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at,
    ps.full_name as sender_name,
    pr.full_name as receiver_name
FROM messages m
JOIN profiles ps ON ps.user_id = m.sender_id
JOIN profiles pr ON pr.user_id = m.receiver_id
WHERE ps.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 5;

-- 4. Check if conversations exist for those messages
SELECT 
    'CONVERSATIONS WITH ADMIN' as step,
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role
FROM conversations c
JOIN profiles p1 ON p1.user_id = c.participant1_id
JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC;

-- 5. Check messages WITHOUT conversation_id (orphaned messages)
SELECT 
    'ORPHANED MESSAGES' as step,
    COUNT(*) as count,
    STRING_AGG(DISTINCT ps.role, ', ') as sender_roles
FROM messages m
LEFT JOIN profiles ps ON ps.user_id = m.sender_id
WHERE m.conversation_id IS NULL;

-- 6. Check if trigger function exists
SELECT 
    'TRIGGER FUNCTION' as step,
    proname as function_name,
    'EXISTS' as status
FROM pg_proc 
WHERE proname = 'ensure_conversation_exists';

-- 7. Check if trigger is active
SELECT 
    'TRIGGER STATUS' as step,
    trigger_name,
    event_manipulation,
    action_timing,
    tgenabled as enabled
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
WHERE trigger_name = 'ensure_conversation_on_message';

-- 8. Test the RLS policies - simulate what a user would see
-- Replace USER_ID_HERE with actual user ID
/*
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "USER_ID_HERE"}';

SELECT 
    'USER VIEW OF CONVERSATIONS' as step,
    c.*
FROM conversations c
WHERE c.participant1_id = 'USER_ID_HERE' 
   OR c.participant2_id = 'USER_ID_HERE';

RESET ROLE;
*/