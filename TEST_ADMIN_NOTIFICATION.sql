-- Test admin notification manually
-- This will send a test notification to all admins

DO $$
BEGIN
    -- Call the notify_admins function directly
    PERFORM notify_admins(
        'system',
        '🧪 Test Notification',
        'This is a test notification to verify admin notifications are working',
        '/admin',
        jsonb_build_object('test', true)
    );
    
    RAISE NOTICE 'Test notification sent to all admins';
END $$;

-- Check if notification was created
SELECT 
    n.id,
    p.full_name,
    p.email,
    p.role,
    n.type,
    n.title,
    n.content,
    n.created_at
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
WHERE p.role = 'admin'
AND n.title = '🧪 Test Notification'
ORDER BY n.created_at DESC;
