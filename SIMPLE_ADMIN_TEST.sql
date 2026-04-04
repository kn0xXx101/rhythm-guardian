-- Simple test: Does admin conversation data exist?

-- Step 1: Get admin ID
WITH admin_user AS (
    SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1
),
-- Step 2: Get a regular user ID  
regular_user AS (
    SELECT user_id FROM profiles WHERE role != 'admin' LIMIT 1
)

-- Step 3: Check if conversation exists between them
SELECT 
    'Conversation Check' as test,
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role
FROM conversations c
CROSS JOIN admin_user au
CROSS JOIN regular_user ru
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE (c.participant1_id = au.user_id AND c.participant2_id = ru.user_id)
   OR (c.participant1_id = ru.user_id AND c.participant2_id = au.user_id);

-- Step 4: If no conversation, check if messages exist without conversation_id
WITH admin_user AS (
    SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1
)
SELECT 
    'Orphaned Admin Messages' as test,
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at
FROM messages m
CROSS JOIN admin_user au
WHERE m.sender_id = au.user_id
  AND m.conversation_id IS NULL
ORDER BY m.created_at DESC
LIMIT 5;