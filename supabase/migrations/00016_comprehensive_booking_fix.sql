-- Migration: Comprehensive booking fix
-- Fixes status issues, payment display issues, and trigger problems

-- Fix the auto-complete trigger to ONLY fire on service confirmation changes
DROP TRIGGER IF EXISTS trigger_auto_complete_booking ON bookings;

CREATE TRIGGER trigger_auto_complete_booking
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    -- ONLY when service confirmation changes, NOT on any other status change
    NEW.service_confirmed_by_hirer IS DISTINCT FROM OLD.service_confirmed_by_hirer
    OR NEW.service_confirmed_by_musician IS DISTINCT FROM OLD.service_confirmed_by_musician
  )
  EXECUTE FUNCTION auto_complete_booking_on_confirmation();

-- Fix bookings that are completed but shouldn't be
UPDATE bookings
SET 
  status = CASE 
    WHEN payment_status = 'paid' THEN 'accepted'  -- If paid, should be accepted
    ELSE 'pending'  -- If not paid, should be pending
  END,
  updated_at = NOW()
WHERE 
  status = 'completed'
  AND (service_confirmed_by_hirer = FALSE OR service_confirmed_by_musician = FALSE OR service_confirmed_by_hirer IS NULL OR service_confirmed_by_musician IS NULL);

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  -- Count fixed bookings
  SELECT COUNT(*) INTO fixed_count
  FROM bookings
  WHERE (status = 'accepted' OR status = 'pending')
    AND updated_at > NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE 'Comprehensive booking fix completed';
  RAISE NOTICE '- Fixed trigger to only fire on service confirmation changes';
  RAISE NOTICE '- Fixed % bookings that were incorrectly marked as completed', fixed_count;
END $$;