-- Make the unified settings row readable across devices (anon + authenticated).
-- This ensures appearance changes propagate without relying on platform_settings sync.

-- Grant SELECT on settings to anon/authenticated (RLS still applies).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.settings TO anon, authenticated;

-- Allow everyone to read ONLY the platform_settings row.
DROP POLICY IF EXISTS "Public can read platform settings row" ON public.settings;
CREATE POLICY "Public can read platform settings row"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (key = 'platform_settings');

