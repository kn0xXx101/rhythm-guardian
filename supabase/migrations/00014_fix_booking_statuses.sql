-- Migration: Fix booking statuses and ensure expired status works
-- This migration fixes booking status issues and ensures auto-expire functionality

-- Add expired status to enum if it doesn't exist
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';

-- Expire pending bookings that are past their event date
UPDATE bookings
SET 
  status = 'expired',
  updated_at = NOW()
WHERE 
  status = 'pending'
  AND event_date < NOW()
  AND event_date IS NOT NULL;

-- Complete bookings where both parties have confirmed service
UPDATE bookings
SET 
  status = 'completed',
  updated_at = NOW()
WHERE 
  status IN ('accepted', 'in_progress')
  AND service_confirmed_by_hirer = TRUE
  AND service_confirmed_by_musician = TRUE
  AND status != 'completed';

-- Log the results
DO $$
DECLARE
  expired_count INTEGER;
  completed_count INTEGER;
BEGIN
  -- Count expired bookings
  SELECT COUNT(*) INTO expired_count
  FROM bookings
  WHERE status = 'expired'
    AND updated_at > NOW() - INTERVAL '5 minutes';
  
  -- Count completed bookings  
  SELECT COUNT(*) INTO completed_count
  FROM bookings
  WHERE status = 'completed'
    AND service_confirmed_by_hirer = TRUE
    AND service_confirmed_by_musician = TRUE
    AND updated_at > NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE 'Booking status fix completed:';
  RAISE NOTICE '- Expired % pending bookings', expired_count;
  RAISE NOTICE '- Auto-completed % bookings', completed_count;
END $$;