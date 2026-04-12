-- Fix security issues identified by Supabase linter
-- 1. Remove SECURITY DEFINER from views
-- 2. Fix RLS policies that reference user_metadata

-- ============================================================================
-- 1. Recreate views without SECURITY DEFINER
-- ============================================================================

-- Drop and recreate bookings_with_profiles view without SECURITY DEFINER
DROP VIEW IF EXISTS bookings_with_profiles CASCADE;

CREATE OR REPLACE VIEW bookings_with_profiles 
WITH (security_invoker = true) AS
SELECT 
    b.*,
    h.full_name as hirer_name,
    h.email as hirer_email,
    h.avatar_url as hirer_avatar,
    m.full_name as musician_name,
    m.email as musician_email,
    m.avatar_url as musician_avatar,
    m.rating as musician_rating,
    m.instruments as musician_instruments
FROM bookings b
LEFT JOIN profiles h ON h.user_id = b.hirer_id
LEFT JOIN profiles m ON m.user_id = b.musician_id;

-- Drop and recreate analytics_summary view without SECURITY DEFINER
DROP VIEW IF EXISTS analytics_summary CASCADE;

CREATE OR REPLACE VIEW analytics_summary 
WITH (security_invoker = true) AS
SELECT 
    COUNT(DISTINCT CASE WHEN role = 'hirer' THEN user_id END) as total_hirers,
    COUNT(DISTINCT CASE WHEN role = 'musician' THEN user_id END) as total_musicians,
    COUNT(DISTINCT CASE WHEN role = 'musician' AND status = 'active' THEN user_id END) as active_musicians,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE payment_status = 'paid') as total_revenue,
    (SELECT COALESCE(SUM(platform_fee), 0) FROM bookings WHERE payment_status = 'paid') as platform_fees
FROM profiles;

-- ============================================================================
-- 2. Fix RLS policies that reference user_metadata
-- ============================================================================

-- Drop existing admin policies that use user_metadata
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Create a helper function to check if user is admin (using app_metadata which is secure)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Check against profiles table (more reliable)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate admin policies using the secure function
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin_user());

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (is_admin_user());

CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (is_admin_user());

-- Add admin policies for other tables if needed
DROP POLICY IF EXISTS "Admins can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;

CREATE POLICY "Admins can insert bookings"
ON bookings FOR INSERT
WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update bookings"
ON bookings FOR UPDATE
USING (is_admin_user());

CREATE POLICY "Admins can delete bookings"
ON bookings FOR DELETE
USING (is_admin_user());

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION is_admin() IS 'Checks if current user is admin using app_metadata (secure)';
COMMENT ON FUNCTION is_admin_user() IS 'Checks if current user is admin by querying profiles table';
COMMENT ON VIEW bookings_with_profiles IS 'View of bookings with profile information (without SECURITY DEFINER)';
COMMENT ON VIEW analytics_summary IS 'Summary analytics view (without SECURITY DEFINER)';
