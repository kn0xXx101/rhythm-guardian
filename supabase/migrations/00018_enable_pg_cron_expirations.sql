-- Migration: Enable pg_cron and schedule expiration job

-- Attempt to enable pg_cron extension (requires superuser, often allowed in Supabase dashboard)
-- NOTE: If this fails during deployment via CLI, users must enable 'pg_cron' via the Supabase Dashboard -> Database -> Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Wait for the extension to be fully active before scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule the expiration check to run at minute 0 of every hour (e.g. 1:00, 2:00)
    -- This handles natural expiration of bookings whose dates have passed naturally
    PERFORM cron.schedule(
      'hourly-booking-expiration-check',
      '0 * * * *',
      $$SELECT check_and_expire_bookings()$$
    );
    RAISE NOTICE 'Scheduled hourly-booking-expiration-check via pg_cron';
  ELSE
    RAISE WARNING 'pg_cron extension is not installed. Automated expirations will not run. Please enable pg_cron in your Supabase Dashboard.';
  END IF;
END $$;
