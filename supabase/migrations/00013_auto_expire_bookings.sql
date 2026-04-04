-- Migration: Auto-expire pending bookings that haven't been accepted
-- Marks bookings as expired when event date/time passes without musician acceptance

-- First, add 'expired' status to booking status enum if not exists
DO $$ 
BEGIN
  -- Check if 'expired' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'expired' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
  ) THEN
    -- Add 'expired' to the booking_status enum
    ALTER TYPE booking_status ADD VALUE 'expired';
    RAISE NOTICE 'Added "expired" status to booking_status enum';
  ELSE
    RAISE NOTICE '"expired" status already exists in booking_status enum';
  END IF;
END $$;

-- Drop the old check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
    RAISE NOTICE 'Dropped old bookings_status_check constraint';
  END IF;
END $$;

-- Create function to automatically expire pending bookings
CREATE OR REPLACE FUNCTION auto_expire_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update bookings that are still pending but event date AND time has passed
  UPDATE bookings
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND event_date < NOW()  -- This checks both date AND time
    AND event_date IS NOT NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration
  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % pending booking(s) that passed their event date/time', expired_count;
  END IF;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to send expiration notifications
CREATE OR REPLACE FUNCTION notify_booking_expired()
RETURNS TRIGGER AS $$
DECLARE
  hirer_name TEXT;
  musician_name TEXT;
  event_info TEXT;
BEGIN
  -- Only proceed if status changed to expired
  IF NEW.status = 'expired' AND OLD.status != 'expired' THEN
    
    -- Get names
    SELECT p.full_name INTO hirer_name
    FROM profiles p
    WHERE p.user_id = NEW.hirer_id;
    
    SELECT p.full_name INTO musician_name
    FROM profiles p
    WHERE p.user_id = NEW.musician_id;
    
    event_info := COALESCE(NEW.event_type, 'Event') || ' on ' || 
                  TO_CHAR(NEW.event_date, 'Mon DD, YYYY');
    
    -- Notify hirer
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
      'booking',
      'Booking Request Expired',
      'Your booking request for ' || event_info || ' with ' || 
      COALESCE(musician_name, 'the musician') || 
      ' has expired as it was not accepted before the event date.',
      '/hirer/bookings',
      FALSE,
      'normal',
      jsonb_build_object(
        'bookingId', NEW.id,
        'reason', 'not_accepted_before_event_date'
      )
    );
    
    -- Notify musician
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
      'booking',
      'Booking Request Expired',
      'A booking request from ' || COALESCE(hirer_name, 'a client') || 
      ' for ' || event_info || 
      ' has expired as it was not accepted before the event date.',
      '/musician/bookings',
      FALSE,
      'normal',
      jsonb_build_object(
        'bookingId', NEW.id,
        'reason', 'not_accepted_before_event_date'
      )
    );
    
    RAISE NOTICE 'Expiration notifications sent for booking %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiration notifications
DROP TRIGGER IF EXISTS trigger_notify_booking_expired ON bookings;
CREATE TRIGGER trigger_notify_booking_expired
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'expired' AND OLD.status IS DISTINCT FROM 'expired')
  EXECUTE FUNCTION notify_booking_expired();

-- Create a scheduled job function (to be called by cron or edge function)
CREATE OR REPLACE FUNCTION check_and_expire_bookings()
RETURNS TABLE(
  expired_count INTEGER,
  message TEXT
) AS $$
DECLARE
  count_expired INTEGER;
BEGIN
  -- Expire pending bookings
  SELECT auto_expire_pending_bookings() INTO count_expired;
  
  RETURN QUERY SELECT 
    count_expired,
    CASE 
      WHEN count_expired > 0 THEN 'Expired ' || count_expired || ' booking(s)'
      ELSE 'No bookings to expire'
    END;
END;
$$ LANGUAGE plpgsql;

-- Expire existing bookings that should already be expired
SELECT auto_expire_pending_bookings();

-- Log completion
DO $$ 
DECLARE
  expired_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expired_count
  FROM bookings
  WHERE status = 'expired';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Auto-Expire Bookings System Installed ===';
  RAISE NOTICE 'Total expired bookings: %', expired_count;
  RAISE NOTICE '';
  RAISE NOTICE 'To manually check and expire bookings, run:';
  RAISE NOTICE '  SELECT * FROM check_and_expire_bookings();';
  RAISE NOTICE '';
  RAISE NOTICE 'Recommended: Set up a daily cron job or edge function';
  RAISE NOTICE 'to call check_and_expire_bookings() automatically.';
  RAISE NOTICE '';
END $$;

-- Add comments
COMMENT ON FUNCTION auto_expire_pending_bookings() IS 
  'Automatically marks pending bookings as expired when event date has passed';

COMMENT ON FUNCTION notify_booking_expired() IS 
  'Sends notifications to both parties when a booking expires';

COMMENT ON FUNCTION check_and_expire_bookings() IS 
  'Main function to check and expire bookings - call this from cron/edge function';

COMMENT ON TRIGGER trigger_notify_booking_expired ON bookings IS 
  'Triggers notifications when a booking is marked as expired';
