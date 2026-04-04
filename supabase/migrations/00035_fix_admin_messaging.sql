-- Fix Admin Messaging System
-- Ensure admin messages properly create notifications for users

-- First, let's make sure the trigger function is correct and handles all cases
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
    
    -- Set action_url based on receiver's role
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

-- Ensure RLS policies allow the trigger to work
-- The trigger runs with SECURITY DEFINER so it should bypass RLS, but let's be explicit

-- Make sure there's a policy that allows system/trigger inserts
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Ensure users can see their notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Ensure users can update their notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Test the trigger with a comment
COMMENT ON FUNCTION create_message_notification IS 'Creates a notification when a new message is sent, with role-based routing and error handling';
COMMENT ON TRIGGER on_message_created ON messages IS 'Automatically creates notifications for new messages';

-- Create an index to improve notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON notifications (user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications (user_id, read);

-- Create an index for message metadata lookups
CREATE INDEX IF NOT EXISTS idx_notifications_message_metadata 
ON notifications USING gin (metadata) 
WHERE type = 'message';