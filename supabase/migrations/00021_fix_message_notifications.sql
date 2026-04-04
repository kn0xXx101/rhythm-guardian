-- Fix message notifications to use correct routes based on user role

CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    receiver_role TEXT;
    action_url TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
    
    -- Get receiver role to determine correct chat route
    SELECT role INTO receiver_role FROM profiles WHERE user_id = NEW.receiver_id;
    
    -- Set action_url based on receiver's role
    CASE receiver_role
        WHEN 'admin' THEN
            action_url := '/admin/chat?user=' || NEW.sender_id;
        WHEN 'musician' THEN
            action_url := '/musician/chat?user=' || NEW.sender_id;
        WHEN 'hirer' THEN
            action_url := '/hirer/chat?user=' || NEW.sender_id;
        ELSE
            action_url := '/dashboard/messages';
    END CASE;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
    VALUES (
        NEW.receiver_id,
        'message',
        'New Message',
        COALESCE(sender_name, 'Someone') || ' sent you a message',
        action_url,
        jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_message_notification();

COMMENT ON FUNCTION create_message_notification IS 'Creates a notification when a new message is sent, with role-based routing';
