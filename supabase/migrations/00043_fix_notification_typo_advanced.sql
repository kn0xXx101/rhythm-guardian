-- Migration Fix for create__notification double underscore error
-- Run this directly in your Supabase SQL Editor

-- 1. Ensure the buggy type exists so we can map it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification__type') THEN
        CREATE TYPE notification__type AS ENUM ('system', 'booking', 'payment', 'message', 'review', 'payout');
    END IF;
END $$;

-- 2. Create the exact matching proxy function
CREATE OR REPLACE FUNCTION public.create__notification(
    p_user_id UUID,
    p_type notification__type,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    -- Forward it to the correct create_notification function, casting the type
    RETURN public.create_notification(p_user_id, p_type::text::notification_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Also proxy if it was passed as generic text
CREATE OR REPLACE FUNCTION public.create__notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN public.create_notification(p_user_id, p_type::notification_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
