-- Complete test of admin conversation system
-- This will help us understand exactly what's happening

-- 1. Check if admin user exists
SELECT 
    'Admin User Check' as section,
    user_id,
    full_name,
    email,
    role
FROM profiles 
WHERE role = 'admin'
LIMIT 1;

-- 2. Check recent messages from admin
SELECT 
    'Recent Admin Messages' as section,
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at,
    ps.full_name as sender_name,
    ps.role as sender_role,
    pr.full_name as receiver_name,
    pr.role as receiver_role
FROM messages m
LEFT JOIN profiles ps ON ps.user_id = m.sender_id
LEFT JOIN profiles pr ON pr.user_id = m.receiver_id
WHERE ps.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 3;

-- 3. Check conversations involving admin
SELECT 
    'Admin Conversations' as section,
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC;

-- 4. Check if trigger function exists
SELECT 
    'Trigger Function Status' as section,
    proname as function_name,
    'EXISTS' as status
FROM pg_proc 
WHERE proname = 'ensure_conversation_exists'
UNION ALL
SELECT 
    'Trigger Function Status' as section,
    'ensure_conversation_exists' as function_name,
    'NOT FOUND' as status
WHERE NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_conversation_exists');

-- 5. Check if trigger exists
SELECT 
    'Trigger Status' as section,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'ensure_conversation_on_message'
UNION ALL
SELECT 
    'Trigger Status' as section,
    'ensure_conversation_on_message' as trigger_name,
    'NOT FOUND' as event_manipulation,
    'NOT FOUND' as action_timing
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'ensure_conversation_on_message'
);

-- 6. Check RLS policies on conversations
SELECT 
    'Conversation RLS Policies' as section,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'conversations'
ORDER BY policyname;

-- 7. Check RLS policies on messages
SELECT 
    'Message RLS Policies' as section,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- 8. Check messages without conversation_id
SELECT 
    'Messages without conversation_id' as section,
    COUNT(*) as count,
    STRING_AGG(DISTINCT ps.role, ', ') as sender_roles
FROM messages m
LEFT JOIN profiles ps ON ps.user_id = m.sender_id
WHERE m.conversation_id IS NULL
GROUP BY 'Messages without conversation_id';

-- 9. Test conversation visibility for a specific user (if we have one)
-- This will show what conversations a regular user can see
WITH test_user AS (
    SELECT user_id FROM profiles 
    WHERE role != 'admin' 
    LIMIT 1
)
SELECT 
    'User Conversation Visibility Test' as section,
    c.id,
    c.participant1_id,
    c.participant2_id,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role,
    CASE 
        WHEN c.participant1_id = tu.user_id OR c.participant2_id = tu.user_id 
        THEN 'SHOULD BE VISIBLE' 
        ELSE 'SHOULD BE HIDDEN' 
    END as visibility_status
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
CROSS JOIN test_user tu
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC;