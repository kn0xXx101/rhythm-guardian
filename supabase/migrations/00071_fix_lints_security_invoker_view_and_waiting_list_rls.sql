-- 00071_fix_lints_security_invoker_view_and_waiting_list_rls.sql
-- Addresses Supabase DB linter findings introduced/flagged after 00069:
-- - musician_search_results should be security_invoker to enforce RLS of querying user
-- - waiting_list INSERT policy should not be unconditional true

-- 1) Recreate musician_search_results as security_invoker (enforces caller RLS)
DROP VIEW IF EXISTS public.musician_search_results;

CREATE OR REPLACE VIEW public.musician_search_results
WITH (security_invoker = true) AS
SELECT
  p.*,
  CASE
    WHEN p.role = 'musician'
      AND p.status = 'active'
      AND p.is_active = TRUE
      AND p.full_name IS NOT NULL
      AND LENGTH(TRIM(p.full_name)) >= 2
      AND p.location IS NOT NULL
      AND LENGTH(TRIM(p.location)) >= 2
      AND COALESCE(array_length(p.instruments, 1), 0) > 0
      AND (
        CASE
          WHEN p.pricing_model = 'fixed' THEN (p.base_price IS NOT NULL AND p.base_price > 0)
          ELSE (p.hourly_rate IS NOT NULL AND p.hourly_rate > 0)
        END
      )
    THEN TRUE
    ELSE FALSE
  END AS search_eligible,
  CASE
    WHEN p.pricing_model = 'fixed' AND p.base_price > 0 THEN 'Fixed: ₵' || p.base_price
    WHEN p.hourly_rate > 0 THEN 'Hourly: ₵' || p.hourly_rate || '/hr'
    ELSE 'No pricing set'
  END AS pricing_display
FROM public.profiles p
WHERE p.role = 'musician';

COMMENT ON VIEW public.musician_search_results IS
  'Updated view that properly handles both flat fee and hourly pricing models (security_invoker).';

-- 2) Tighten waiting_list anon insert policy (still allows waitlist signup)
DO $$
BEGIN
  -- Ensure RLS is enabled (no-op if already enabled)
  EXECUTE 'ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN
  -- waiting_list may not exist in older DBs; skip
  NULL;
END $$;

DO $$
BEGIN
  -- Drop the overly-permissive policy if present
  EXECUTE 'DROP POLICY IF EXISTS "Allow anonymous insertions to waiting_list" ON public.waiting_list';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Allow anon inserts, but only for well-formed rows
-- (prevents arbitrary writes while preserving the intended waitlist capture behavior).
CREATE POLICY "Allow anonymous insertions to waiting_list"
ON public.waiting_list
FOR INSERT
TO anon
WITH CHECK (
  email IS NOT NULL
  AND LENGTH(TRIM(email)) BETWEEN 5 AND 320
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
  AND COALESCE(source, 'geo_restriction') IN ('geo_restriction', 'coming_soon', 'marketing', 'referral')
);

