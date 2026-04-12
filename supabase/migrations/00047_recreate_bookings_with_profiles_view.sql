-- Force-recreate bookings_with_profiles view with required columns.
-- This is safe to run multiple times and fixes UI expecting:
--   hirer_avatar, musician_avatar, musician_rating, musician_instruments

DROP VIEW IF EXISTS public.bookings_with_profiles;

CREATE OR REPLACE VIEW public.bookings_with_profiles
WITH (security_invoker = true) AS
SELECT
  b.*,
  h.full_name  AS hirer_name,
  h.email      AS hirer_email,
  h.avatar_url AS hirer_avatar,
  m.full_name  AS musician_name,
  m.email      AS musician_email,
  m.avatar_url AS musician_avatar,
  m.rating     AS musician_rating,
  m.instruments AS musician_instruments
FROM public.bookings b
LEFT JOIN public.profiles h ON h.user_id = b.hirer_id
LEFT JOIN public.profiles m ON m.user_id = b.musician_id;

