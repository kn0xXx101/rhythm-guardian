-- Debug admin conversations issue
-- Check what's actually in the database

-- 1. Check recent messages from admin
SELECT 
    'Recent Admin Messages' as section,
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at,
    ps.full_name as sender_name,
    ps.role as sender_role
FROM messages m
LEFT JOIN profiles ps ON ps.user_id = m.sender_id
WHERE ps.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 5;

-- 2. Check if conversations exist for admin messages
SELECT 
    'Admin Conversations' as section,
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC;

-- 3. Check messages without conversation_id
SELECT 
    'Messages without conversation_id' as section,
    COUNT(*) as count
FROM messages m
WHERE m.conversation_id IS NULL;

-- 4. Check if the trigger function exists
SELECT 
    'Trigger Function Status' as section,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'ensure_conversation_exists';