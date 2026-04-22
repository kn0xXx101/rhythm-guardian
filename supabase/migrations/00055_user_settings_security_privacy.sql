-- Extra user preference columns for Settings page (security + privacy).
-- Defaults keep existing behaviour (public profile, show activity, login alerts on).

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS login_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_activity_status BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_settings.login_notifications IS 'Email/push-style alerts when a new session is detected (best-effort; delivery depends on platform).';
COMMENT ON COLUMN public.user_settings.profile_public IS 'When true, profile is treated as discoverable in search/listings.';
COMMENT ON COLUMN public.user_settings.show_activity_status IS 'When true, show online/last-active style presence where the app supports it.';
