-- Migration: Auto-complete bookings and release payouts when both parties confirm service
-- This ensures bookings are marked as "completed" and funds are released automatically

-- Create function to auto-update booking status to completed and release payout
CREATE OR REPLACE FUNCTION auto_complete_booking_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If both parties have now confirmed, update status to completed and release payout
  IF NEW.service_confirmed_by_hirer = TRUE 
     AND NEW.service_confirmed_by_musician = TRUE 
     AND (OLD.service_confirmed_by_hirer = FALSE OR OLD.service_confirmed_by_musician = FALSE) THEN
    
    -- Set status to completed
    NEW.status = 'completed';
    
    -- Set confirmation timestamp if not already set
    IF NEW.service_confirmed_at IS NULL THEN
      NEW.service_confirmed_at = NOW();
    END IF;
    
    -- Automatically release payout if payment has been received
    IF NEW.payment_status = 'paid' AND (NEW.payout_released IS NULL OR NEW.payout_released = FALSE) THEN
      NEW.payout_released = TRUE;
      NEW.payout_released_at = NOW();
      RAISE NOTICE 'Booking % automatically marked as completed and payout released', NEW.id;
    ELSE
      RAISE NOTICE 'Booking % automatically marked as completed', NEW.id;
    END IF;
  END IF;
  
  -- If booking is being marked as expired and payment was made, mark for refund
  IF NEW.status = 'expired' AND OLD.status != 'expired' AND NEW.payment_status = 'paid' THEN
    NEW.payment_status = 'refunded';
    NEW.refund_amount = NEW.total_amount;
    NEW.refund_percentage = 100;
    NEW.refund_processed_at = NOW();
    NEW.refund_reference = 'AUTO_REFUND_EXPIRED_' || NEW.id;
    RAISE NOTICE 'Booking % expired - marked for full refund of %', NEW.id, NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before update on bookings table
DROP TRIGGER IF EXISTS trigger_auto_complete_booking ON bookings;
CREATE TRIGGER trigger_auto_complete_booking
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    NEW.service_confirmed_by_hirer IS DISTINCT FROM OLD.service_confirmed_by_hirer
    OR NEW.service_confirmed_by_musician IS DISTINCT FROM OLD.service_confirmed_by_musician
  )
  EXECUTE FUNCTION auto_complete_booking_on_confirmation();

-- Update existing bookings that should be completed and release payouts
UPDATE bookings
SET 
  status = 'completed',
  service_confirmed_at = COALESCE(service_confirmed_at, updated_at),
  payout_released = CASE 
    WHEN payment_status = 'paid' AND (payout_released IS NULL OR payout_released = FALSE) 
    THEN TRUE 
    ELSE payout_released 
  END,
  payout_released_at = CASE 
    WHEN payment_status = 'paid' AND (payout_released IS NULL OR payout_released = FALSE) 
    THEN COALESCE(payout_released_at, NOW()) 
    ELSE payout_released_at 
  END
WHERE 
  service_confirmed_by_hirer = TRUE 
  AND service_confirmed_by_musician = TRUE
  AND (status != 'completed' OR (payment_status = 'paid' AND payout_released = FALSE));

-- Log the changes
DO $$ 
DECLARE
  updated_count INTEGER;
  released_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Count how many had payouts released
  SELECT COUNT(*) INTO released_count
  FROM bookings
  WHERE service_confirmed_by_hirer = TRUE 
    AND service_confirmed_by_musician = TRUE
    AND payment_status = 'paid'
    AND payout_released = TRUE;
  
  RAISE NOTICE 'Updated % existing bookings to completed status', updated_count;
  RAISE NOTICE 'Released payouts for % bookings', released_count;
END $$;

COMMENT ON FUNCTION auto_complete_booking_on_confirmation() IS 
  'Automatically marks a booking as completed and releases payout when both hirer and musician confirm service rendering';

COMMENT ON TRIGGER trigger_auto_complete_booking ON bookings IS 
  'Triggers automatic completion of booking and payout release when both parties confirm service';

-- Create function to notify musician when payout is released
CREATE OR REPLACE FUNCTION notify_payout_released()
RETURNS TRIGGER AS $$
DECLARE
  musician_name TEXT;
  booking_amount NUMERIC;
BEGIN
  -- Only proceed if payout was just released
  IF NEW.payout_released = TRUE AND (OLD.payout_released IS NULL OR OLD.payout_released = FALSE) THEN
    
    -- Get musician name and booking amount
    SELECT p.full_name, NEW.total_amount
    INTO musician_name, booking_amount
    FROM profiles p
    WHERE p.user_id = NEW.musician_id;
    
    -- Create notification for musician
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      action_url,
      read,
      priority,
      metadata
    ) VALUES (
      NEW.musician_id,
      'payment',
      'Payment Released! 💰',
      'Your payment has been automatically released after service confirmation. The funds are on their way to your account.',
      '/musician/payouts',
      FALSE,
      'high',
      jsonb_build_object(
        'bookingId', NEW.id,
        'amount', booking_amount,
        'releasedAt', NEW.payout_released_at
      )
    );
    
    RAISE NOTICE 'Payout release notification sent to musician %', NEW.musician_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout release notifications
DROP TRIGGER IF EXISTS trigger_notify_payout_released ON bookings;
CREATE TRIGGER trigger_notify_payout_released
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.payout_released IS DISTINCT FROM OLD.payout_released)
  EXECUTE FUNCTION notify_payout_released();

COMMENT ON FUNCTION notify_payout_released() IS 
  'Sends notification to musician when their payout is released';

COMMENT ON TRIGGER trigger_notify_payout_released ON bookings IS 
  'Triggers notification when payout is released to musician';
