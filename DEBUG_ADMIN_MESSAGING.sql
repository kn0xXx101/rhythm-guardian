-- Debug Admin Messaging Issue
-- This script helps diagnose why users don't receive admin messages

-- 1. Check if the message notification trigger exists and is active
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_message_created';

-- 2. Check if the create_message_notification function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_message_notification';

-- 3. Test the trigger by checking recent messages and their corresponding notifications
WITH recent_messages AS (
    SELECT 
        m.id as message_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.created_at as message_created_at,
        sender.full_name as sender_name,
        sender.role as sender_role,
        receiver.full_name as receiver_name,
        receiver.role as receiver_role
    FROM messages m
    LEFT JOIN profiles sender ON m.sender_id = sender.user_id
    LEFT JOIN profiles receiver ON m.receiver_id = receiver.user_id
    WHERE m.created_at > NOW() - INTERVAL '24 hours'
    ORDER BY m.created_at DESC
    LIMIT 10
),
message_notifications AS (
    SELECT 
        n.id as notification_id,
        n.user_id as notification_receiver_id,
        n.type,
        n.title,
        n.content as notification_content,
        n.created_at as notification_created_at,
        n.metadata->>'message_id' as related_message_id,
        n.metadata->>'sender_id' as notification_sender_id
    FROM notifications n
    WHERE n.type = 'message' 
    AND n.created_at > NOW() - INTERVAL '24 hours'
)
SELECT 
    rm.message_id,
    rm.sender_name,
    rm.sender_role,
    rm.receiver_name,
    rm.receiver_role,
    rm.content as message_content,
    rm.message_created_at,
    mn.notification_id,
    mn.notification_content,
    mn.notification_created_at,
    CASE 
        WHEN mn.notification_id IS NULL THEN 'NO NOTIFICATION CREATED'
        ELSE 'NOTIFICATION EXISTS'
    END as notification_status
FROM recent_messages rm
LEFT JOIN message_notifications mn ON rm.message_id::text = mn.related_message_id
ORDER BY rm.message_created_at DESC;

-- 4. Check for any admin messages specifically
SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.created_at,
    sender.full_name as admin_name,
    receiver.full_name as user_name,
    receiver.role as user_role
FROM messages m
JOIN profiles sender ON m.sender_id = sender.user_id
JOIN profiles receiver ON m.receiver_id = receiver.user_id
WHERE sender.role = 'admin'
AND m.created_at > NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC
LIMIT 20;

-- 5. Check if those admin messages have corresponding notifications
SELECT 
    m.id as message_id,
    m.content as message_content,
    m.created_at as message_time,
    sender.full_name as admin_name,
    receiver.full_name as user_name,
    n.id as notification_id,
    n.title as notification_title,
    n.content as notification_content,
    n.created_at as notification_time,
    n.read as notification_read
FROM messages m
JOIN profiles sender ON m.sender_id = sender.user_id
JOIN profiles receiver ON m.receiver_id = receiver.user_id
LEFT JOIN notifications n ON (
    n.user_id = m.receiver_id 
    AND n.type = 'message' 
    AND n.metadata->>'message_id' = m.id::text
)
WHERE sender.role = 'admin'
AND m.created_at > NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC;

-- 6. Check notification subscription status for users
SELECT 
    p.user_id,
    p.full_name,
    p.role,
    COUNT(n.id) as total_notifications,
    COUNT(CASE WHEN n.type = 'message' THEN 1 END) as message_notifications,
    COUNT(CASE WHEN n.read = false THEN 1 END) as unread_notifications
FROM profiles p
LEFT JOIN notifications n ON p.user_id = n.user_id
WHERE p.role IN ('musician', 'hirer')
GROUP BY p.user_id, p.full_name, p.role
ORDER BY p.role, p.full_name;