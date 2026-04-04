-- Test script to verify admin messages now appear in chat lists
-- Run this after an admin sends a message to a user

-- 1. Check if admin message exists
SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.created_at,
    sender.full_name as sender_name,
    sender.role as sender_role,
    receiver.full_name as receiver_name,
    receiver.role as receiver_role
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.user_id
LEFT JOIN profiles receiver ON m.receiver_id = receiver.user_id
WHERE sender.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 5;

-- 2. Simulate what HirerChat.tsx now does - get all messages for a user
-- Replace 'USER_ID_HERE' with actual user ID
WITH user_messages AS (
    SELECT DISTINCT
        CASE 
            WHEN sender_id = 'USER_ID_HERE' THEN receiver_id
            ELSE sender_id
        END as other_user_id,
        MAX(created_at) as last_message_time
    FROM messages
    WHERE sender_id = 'USER_ID_HERE' 
       OR receiver_id = 'USER_ID_HERE'
    GROUP BY other_user_id
)
SELECT 
    um.other_user_id,
    um.last_message_time,
    p.full_name,
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN 'Admin'
        ELSE p.full_name
    END as display_name
FROM user_messages um
LEFT JOIN profiles p ON um.other_user_id = p.user_id
ORDER BY um.last_message_time DESC;

-- 3. Check notification was created
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.action_url,
    n.read,
    n.created_at,
    p.full_name as recipient_name,
    p.role as recipient_role
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.user_id
WHERE n.type = 'message'
  AND n.message LIKE '%Admin%'
ORDER BY n.created_at DESC
LIMIT 5;

-- 4. Expected results:
-- - Query 1 should show admin messages
-- - Query 2 should show admin user in the conversation list with display_name = 'Admin'
-- - Query 3 should show notifications with "Admin sent you a message"
