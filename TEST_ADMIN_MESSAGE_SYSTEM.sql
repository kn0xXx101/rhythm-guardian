-- Test Admin Message System
-- This script tests if admin messages create proper notifications

-- Step 1: Create a test message from admin to a user
-- Replace 'ADMIN_USER_ID' and 'TEST_USER_ID' with actual IDs

DO $$
DECLARE
    admin_id UUID;
    test_user_id UUID;
    message_id UUID;
    notification_count INTEGER;
BEGIN
    -- Get an admin user
    SELECT user_id INTO admin_id 
    FROM profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- Get a test user (musician or hirer)
    SELECT user_id INTO test_user_id 
    FROM profiles 
    WHERE role IN ('musician', 'hirer') 
    LIMIT 1;
    
    IF admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found';
        RETURN;
    END IF;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No test user found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with admin: % and user: %', admin_id, test_user_id;
    
    -- Insert a test message
    INSERT INTO messages (sender_id, receiver_id, content, read)
    VALUES (admin_id, test_user_id, 'Test message from admin - ' || NOW(), false)
    RETURNING id INTO message_id;
    
    RAISE NOTICE 'Created test message: %', message_id;
    
    -- Wait a moment for trigger to execute
    PERFORM pg_sleep(1);
    
    -- Check if notification was created
    SELECT COUNT(*) INTO notification_count
    FROM notifications 
    WHERE user_id = test_user_id 
    AND type = 'message'
    AND metadata->>'message_id' = message_id::text;
    
    IF notification_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Notification created for message %', message_id;
    ELSE
        RAISE NOTICE 'FAILURE: No notification created for message %', message_id;
    END IF;
    
    -- Show the notification details
    RAISE NOTICE 'Notification details:';
    FOR rec IN 
        SELECT id, title, content, action_url, created_at
        FROM notifications 
        WHERE user_id = test_user_id 
        AND type = 'message'
        AND metadata->>'message_id' = message_id::text
    LOOP
        RAISE NOTICE 'ID: %, Title: %, Content: %, URL: %, Created: %', 
            rec.id, rec.title, rec.content, rec.action_url, rec.created_at;
    END LOOP;
    
END $$;

-- Step 2: Check recent admin messages and their notifications
SELECT 
    'Recent Admin Messages and Notifications' as section;

SELECT 
    m.id as message_id,
    m.content as message_content,
    m.created_at as message_time,
    sender.full_name as admin_name,
    receiver.full_name as user_name,
    receiver.role as user_role,
    n.id as notification_id,
    n.title as notification_title,
    n.read as notification_read,
    n.action_url
FROM messages m
JOIN profiles sender ON m.sender_id = sender.user_id
JOIN profiles receiver ON m.receiver_id = receiver.user_id
LEFT JOIN notifications n ON (
    n.user_id = m.receiver_id 
    AND n.type = 'message' 
    AND n.metadata->>'message_id' = m.id::text
)
WHERE sender.role = 'admin'
AND m.created_at > NOW() - INTERVAL '1 hour'
ORDER BY m.created_at DESC
LIMIT 10;

-- Step 3: Check trigger status
SELECT 
    'Trigger Status' as section;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_message_created'
AND table_name = 'messages';

-- Step 4: Check function definition
SELECT 
    'Function Definition' as section;

SELECT routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_message_notification'
AND routine_type = 'FUNCTION';