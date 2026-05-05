-- 00074_revoke_public_execute_for_new_functions.sql
-- Follow-up security hardening after 00069 + new migrations:
-- - Ensure anon/public cannot call SECURITY DEFINER functions via RPC
-- - Includes new/overloaded functions added in 00070/00073

DO $$
BEGIN
    -- create_notification overload restored in 00070
    REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
    
    -- notification dedupe trigger helper (00073) should never be callable via RPC
    REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_notifications() FROM PUBLIC;
    
EXCEPTION WHEN OTHERS THEN
    -- ignore missing functions / signature differences
    RAISE NOTICE 'Revocation skipped for some functions: %', SQLERRM;
END $$;

-- Explicit grants (only where needed)
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO service_role;