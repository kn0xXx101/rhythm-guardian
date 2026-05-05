-- 00070_fix_create_notification_signature_overload.sql
-- Fix: some triggers/functions call create_notification(UUID, notification_type, ...)
-- but the consolidated system defines create_notification(UUID, TEXT, ...).
-- Add an overload that forwards to the TEXT entrypoint.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_content TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_notification(
    p_user_id,
    p_type::TEXT,
    p_title,
    p_content,
    p_action_url,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO service_role;

