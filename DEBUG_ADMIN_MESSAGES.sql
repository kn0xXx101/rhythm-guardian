-- Debug Admin Messages Issue
-- Check if messages exist and if they have conversation_id

-- 1. Check recent messages from admin
SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at,
    p.full_name as sender_name,
    p.role as sender_role
FROM messages m
LEFT JOIN profiles p ON p.user_id = m.sender_id
WHERE p.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 10;

-- 2. Check if conversations exist for these messages
SELECT 
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p2.full_name as participant2_name
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE c.participant1_id IN (SELECT user_id FROM profiles WHERE role = 'admin')
   OR c.participant2_id IN (SELECT user_id FROM profiles WHERE role = 'admin')
ORDER BY c.last_message_at DESC
LIMIT 10;

-- 3. Check messages without conversation_id
SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at
FROM messages m
WHERE m.conversation_id IS NULL
ORDER BY m.created_at DESC
LIMIT 10;

-- 4. Check if the trigger is active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'ensure_conversation_on_message';
