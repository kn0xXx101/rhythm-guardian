-- Supabase database linter: function_search_path_mutable + public_bucket_allows_listing
-- See: https://supabase.com/docs/guides/database/database-linter

-- -----------------------------------------------------------------------------
-- 1) Immutable search_path on SECURITY-sensitive / trigger functions
--    (Later migrations may have recreated bodies without preserving ALTER settings.)
-- -----------------------------------------------------------------------------

ALTER FUNCTION public.notify_admins(text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.notify_admins_on_booking_change() SET search_path = public;
ALTER FUNCTION public.notify_admins_on_new_user() SET search_path = public;
ALTER FUNCTION public.notify_admins_on_document_submission() SET search_path = public;
ALTER FUNCTION public.create_booking_notification() SET search_path = public;
ALTER FUNCTION public.auto_expire_pending_bookings() SET search_path = public;
ALTER FUNCTION public.check_and_expire_bookings() SET search_path = public;
ALTER FUNCTION public.auto_expire_past_event_window() SET search_path = public;

-- -----------------------------------------------------------------------------
-- 2) Public buckets: drop broad SELECT policies that allow listing all objects.
--    Public URLs to objects still work when the bucket is public; listing is what we remove.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can view portfolio files" ON storage.objects;

-- -----------------------------------------------------------------------------
-- 3) chat-files: replace bucket-wide SELECT with conversation-scoped access
--    Paths are `${conversationId}/...` (see src/services/chat.ts).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view chat files" ON storage.objects;

CREATE POLICY "Users can view chat files in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);
