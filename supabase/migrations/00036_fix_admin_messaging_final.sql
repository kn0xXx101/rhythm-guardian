-- Final Fix for Admin Messaging System
-- 1. Shows "Admin" instead of real admin name
-- 2. Fixes action URLs to use correct chat paths
-- 3. Ensures users can navigate to the specific conversation

CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    sender_role TEXT;
    receiver_role TEXT;
    action_url TEXT;
    display_name TEXT;
BEGIN
    -- Skip if this is a system message or if sender and receiver are the same
    IF NEW.sender_id = NEW.receiver_id THEN
        RETURN NEW;
    END IF;
    
    -- Get sender name and role
    SELECT full_name, role INTO sender_name, sender_role 
    FROM profiles 
    WHERE user_id = NEW.sender_id;
    
    -- Get receiver role to determine correct chat route
    SELECT role INTO receiver_role 
    FROM profiles 
    WHERE user_id = NEW.receiver_id;
    
    -- Set display name based on sender role
    IF sender_role = 'admin' THEN
        display_name := 'Admin';
    ELSE
        display_name := COALESCE(sender_name, 'Someone');
    END IF;
    
    -- Set action_url based on receiver's role with sender parameter for direct navigation
    CASE receiver_role
        WHEN 'admin' THEN
            action_url := '/admin/chat?user=' || NEW.sender_id;
        WHEN 'musician' THEN
            action_url := '/musician/chat?user=' || NEW.sender_id;
        WHEN 'hirer' THEN
            action_url := '/hirer/chat?user=' || NEW.sender_id;
        ELSE
            action_url := '/dashboard/messages?user=' || NEW.sender_id;
    END CASE;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata, read)
    VALUES (
        NEW.receiver_id,
        'message',
        'New Message',
        display_name || ' sent you a message',
        action_url,
        jsonb_build_object(
            'message_id', NEW.id, 
            'sender_id', NEW.sender_id,
            'sender_name', display_name,
            'sender_role', sender_role
        ),
        false
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the message insert
        RAISE WARNING 'Failed to create message notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- Update existing notifications from admins to show "Admin" instead of real names
UPDATE notifications 
SET content = REPLACE(content, 
    (SELECT full_name FROM profiles WHERE user_id = (metadata->>'sender_id')::uuid AND role = 'admin'),
    'Admin'
)
WHERE type = 'message' 
AND metadata->>'sender_role' = 'admin'
AND content LIKE '%sent you a message';

-- Also update the metadata to reflect the display name change
UPDATE notifications 
SET metadata = jsonb_set(metadata, '{sender_name}', '"Admin"')
WHERE type = 'message' 
AND metadata->>'sender_role' = 'admin';

COMMENT ON FUNCTION create_message_notification IS 'Creates notifications for new messages with proper admin display name and correct navigation URLs';
COMMENT ON TRIGGER on_message_created ON messages IS 'Automatically creates notifications for new messages with admin anonymization';