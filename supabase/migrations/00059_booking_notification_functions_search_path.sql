-- Supabase linter 0011_function_search_path_mutable:
-- 00056 recreated these trigger functions without SET search_path, which cleared 00054's ALTER.
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

ALTER FUNCTION public.create_booking_notification() SET search_path = public;
ALTER FUNCTION public.notify_admins_on_booking_change() SET search_path = public;
