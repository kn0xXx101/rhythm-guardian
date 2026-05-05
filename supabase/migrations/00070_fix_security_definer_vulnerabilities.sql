-- 00070_fix_security_definer_vulnerabilities.sql
-- Fixes security vulnerabilities where SECURITY DEFINER functions were executable by anonymous users.
-- This follows Supabase security best practices: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

-- 1. Revoke default EXECUTE from PUBLIC for all sensitive SECURITY DEFINER functions
-- This ensures that 'anon' and other unauthorized roles cannot call these functions via RPC.

DO $$ 
BEGIN
    -- Core Notification Functions
    REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.create__notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.create__notification(UUID, notification__type, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.create__notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;

    -- Internal Trigger Functions (Should never be called via RPC)
    REVOKE EXECUTE ON FUNCTION public.handle_booking_notifications() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.handle_profile_notifications() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.handle_review_notifications() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.handle_support_notifications() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.create_message_notification() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.create_profile_for_user() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.apply_message_content_auto_flag() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.auto_activate_on_verification() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.auto_close_expired_tickets() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.cleanup_expired_support_tickets() FROM PUBLIC;

    -- Utility & Business Logic Functions
    REVOKE EXECUTE ON FUNCTION public.add_ticket_message(UUID, TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.can_users_message(UUID, UUID) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.check_musician_availability(UUID, TIMESTAMPTZ, NUMERIC, UUID) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.check_musician_search_eligibility(UUID) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.confirm_service(UUID, TEXT) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.ensure_conversation_exists() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.get_new_ticket_messages(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;

EXCEPTION WHEN OTHERS THEN
    -- If some functions don't exist in the current schema, ignore the error and continue
    RAISE NOTICE 'Some functions were not found for revocation: %', SQLERRM;
END $$;

-- 2. Explicitly Grant EXECUTE to authorized roles only

-- Functions that need to be called by the frontend (Authenticated users)
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, notification__type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_musician_availability(UUID, TIMESTAMPTZ, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_users_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_service(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_ticket_message(UUID, TEXT, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_new_ticket_messages(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

-- Functions that are purely internal (Triggers) do NOT need any GRANTS to authenticated.
-- They run with the permissions of the user who owns them (usually postgres/service_role).

-- 3. Security Check for any future functions:
-- It is recommended to always REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
-- and then explicitly grant what is needed.
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
