-- Ensure platform_settings is readable on all devices (anon + authenticated).
-- RLS policy already allows SELECT using (true), but Postgres privileges may still block reads.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.platform_settings TO anon, authenticated;

