-- Fix: Ensure admin messages appear in user conversations
-- This script manually creates conversations for existing admin messages
-- and ensures the conversation appears in the user's chat list

-- Step 1: Create conversations for all admin messages that don't have them
INSERT INTO conversations (participant1_id, participant2_id, last_message_at, created_at, updated_at)
SELECT DISTINCT
    LEAST(m.sender_id, m.receiver_id) as participant1_id,
    GREATEST(m.sender_id, m.receiver_id) as participant2_id,
    MAX(m.created_at) as last_message_at,
    MIN(m.created_at) as created_at,
    MAX(m.created_at) as updated_at
FROM messages m
INNER JOIN profiles p ON p.user_id = m.sender_id
WHERE p.role = 'admin'
AND m.sender_id != m.receiver_id
AND NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.participant1_id = LEAST(m.sender_id, m.receiver_id) 
       AND c.participant2_id = GREATEST(m.sender_id, m.receiver_id))
)
GROUP BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
ON CONFLICT (participant1_id, participant2_id) DO UPDATE
SET last_message_at = EXCLUDED.last_message_at,
    updated_at = EXCLUDED.updated_at;

-- Step 2: Update all messages to link them to their conversations
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
AND (
    (c.participant1_id = LEAST(m.sender_id, m.receiver_id) 
     AND c.participant2_id = GREATEST(m.sender_id, m.receiver_id))
);

-- Step 3: Verify the fix
SELECT 
    'Admin Messages' as check_type,
    COUNT(*) as total_messages,
    COUNT(DISTINCT conversation_id) as conversations_created,
    COUNT(CASE WHEN conversation_id IS NULL THEN 1 END) as messages_without_conversation
FROM messages m
INNER JOIN profiles p ON p.user_id = m.sender_id
WHERE p.role = 'admin';

-- Step 4: Show recent admin conversations
SELECT 
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role,
    c.last_message_at,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC
LIMIT 10;
