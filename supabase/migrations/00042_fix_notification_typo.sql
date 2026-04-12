-- Migration: Add alias for create_notification to fix typo error
-- This creates a proxy function to catch calls with a double-underscore typo 
-- or type mismatches that are causing the "Booking failed" error.

-- 1. Create proxy with proper enum type
CREATE OR REPLACE FUNCTION create__notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN create_notification(p_user_id, p_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create proxy with text type (in case the trigger passes a string that fails to cast)
CREATE OR REPLACE FUNCTION create__notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    -- Cast the text to notification_type
    RETURN create_notification(p_user_id, p_type::notification_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Also add a text version of the original function just in case the error 
-- was actually just a signature mismatch on the exact name 'create_notification'
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN create_notification(p_user_id, p_type::notification_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
