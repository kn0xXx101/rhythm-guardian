-- Add a user-controlled activity/availability flag used for discovery.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.is_active IS
  'User controlled active/inactive availability. Inactive musicians are hidden from hirer search.';

CREATE INDEX IF NOT EXISTS idx_profiles_role_status_active
  ON public.profiles(role, status, is_active);
