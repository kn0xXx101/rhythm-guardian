-- Debug: Check what messages exist and why admin isn't showing in conversation list

-- 1. Check all messages for this user (replace with actual user ID)
SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.created_at,
    sender.role as sender_role,
    sender.full_name as sender_name,
    receiver.role as receiver_role,
    receiver.full_name as receiver_name
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN profiles receiver ON m.receiver_id = receiver.id
WHERE m.receiver_id = 'YOUR_USER_ID_HERE' -- Replace with actual user ID
   OR m.sender_id = 'YOUR_USER_ID_HERE'
ORDER BY m.created_at DESC
LIMIT 20;

-- 2. Check what the conversation list query returns
-- This simulates what MusicianChat.tsx does
WITH user_messages AS (
    SELECT DISTINCT
        CASE 
            WHEN sender_id = 'YOUR_USER_ID_HERE' THEN receiver_id
            ELSE sender_id
        END as other_user_id,
        MAX(created_at) as last_message_time
    FROM messages
    WHERE sender_id = 'YOUR_USER_ID_HERE' 
       OR receiver_id = 'YOUR_USER_ID_HERE'
    GROUP BY other_user_id
)
SELECT 
    um.other_user_id,
    um.last_message_time,
    p.full_name,
    p.role,
    p.avatar_url
FROM user_messages um
LEFT JOIN profiles p ON um.other_user_id = p.id
ORDER BY um.last_message_time DESC;

-- 3. Check if there are any admin users
SELECT id, full_name, role, email
FROM profiles
WHERE role = 'admin';
