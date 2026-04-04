-- Migration: Automatic refund for expired and cancelled bookings
-- When a paid booking expires or is cancelled/rejected by musician, automatically process refund

-- Function to automatically process refund for expired/cancelled bookings
CREATE OR REPLACE FUNCTION auto_process_refund_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  refund_reason TEXT;
  should_refund BOOLEAN := FALSE;
BEGIN
  -- Only process if booking was paid
  IF NEW.payment_status IN ('paid_to_admin', 'service_completed') THEN
    
    -- Check if booking expired (was pending and now expired)
    IF NEW.status = 'expired' AND OLD.status = 'pending' THEN
      should_refund := TRUE;
      refund_reason := 'Booking expired - musician did not accept before event date';
    
    -- Check if booking was rejected by musician
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      should_refund := TRUE;
      refund_reason := 'Booking rejected by musician';
    
    -- Check if booking was cancelled by musician (after being accepted)
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'accepted' THEN
      should_refund := TRUE;
      refund_reason := 'Booking cancelled by musician';
    END IF;

    -- Process refund if needed
    IF should_refund THEN
      -- Insert refund request
      INSERT INTO refunds (
        booking_id,
        user_id,
        amount,
        reason,
        status,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.hirer_id,
        NEW.total_amount,
        refund_reason,
        'pending',
        NOW(),
        NOW()
      );

      -- Update booking payment status to indicate refund is pending
      NEW.payment_status := 'refunded';
      
      -- Notify hirer about automatic refund
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
        NEW.hirer_id,
        'payment',
        'Automatic Refund Initiated',
        'Your payment for the ' || COALESCE(NEW.event_type, 'booking') || 
        ' has been automatically refunded. Reason: ' || refund_reason,
        '/hirer/bookings',
        FALSE,
        'high',
        jsonb_build_object(
          'bookingId', NEW.id,
          'refundAmount', NEW.total_amount,
          'reason', refund_reason
        )
      );

      RAISE NOTICE 'Automatic refund initiated for booking % - Reason: %', NEW.id, refund_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic refunds
DROP TRIGGER IF EXISTS trigger_auto_refund_on_status_change ON bookings;
CREATE TRIGGER trigger_auto_refund_on_status_change
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    NEW.status IN ('expired', 'rejected', 'cancelled') AND 
    OLD.status IS DISTINCT FROM NEW.status AND
    NEW.payment_status IN ('paid_to_admin', 'service_completed')
  )
  EXECUTE FUNCTION auto_process_refund_on_status_change();

-- Update the booking expiration function to work with auto-refund
CREATE OR REPLACE FUNCTION auto_expire_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update bookings that are still pending but event date AND time has passed
  -- The trigger will automatically handle refunds for paid bookings
  UPDATE bookings
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND event_date < NOW()
    AND event_date IS NOT NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration
  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % pending booking(s) that passed their event date/time', expired_count;
  END IF;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION auto_process_refund_on_status_change() IS 
  'Automatically processes refunds when paid bookings expire, are rejected, or cancelled by musician';

COMMENT ON TRIGGER trigger_auto_refund_on_status_change ON bookings IS 
  'Triggers automatic refund processing for expired/rejected/cancelled paid bookings';

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Automatic Refund System Installed ===';
  RAISE NOTICE 'Refunds will be automatically processed when:';
  RAISE NOTICE '  1. Paid booking expires (musician did not accept)';
  RAISE NOTICE '  2. Musician rejects a paid booking';
  RAISE NOTICE '  3. Musician cancels an accepted paid booking';
  RAISE NOTICE '';
  RAISE NOTICE 'Hirers will receive notifications about automatic refunds.';
  RAISE NOTICE '';
END $$;
