-- Migration: Fix payment completion bug
-- Bookings were incorrectly marked as completed when payment was made
-- They should only be completed when both parties confirm service was rendered

-- Fix bookings that were incorrectly marked as completed
-- These should be 'accepted' (paid but service not yet confirmed by both parties)
UPDATE bookings
SET 
  status = 'accepted',
  updated_at = NOW()
WHERE 
  status = 'completed'
  AND (service_confirmed_by_hirer = FALSE OR service_confirmed_by_musician = FALSE)
  AND payment_status = 'paid';

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  -- Count fixed bookings
  SELECT COUNT(*) INTO fixed_count
  FROM bookings
  WHERE status = 'accepted'
    AND payment_status = 'paid'
    AND (service_confirmed_by_hirer = FALSE OR service_confirmed_by_musician = FALSE)
    AND updated_at > NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE 'Fixed % bookings that were incorrectly marked as completed', fixed_count;
  RAISE NOTICE 'These bookings are now "accepted" and will be completed when both parties confirm service';
END $$;