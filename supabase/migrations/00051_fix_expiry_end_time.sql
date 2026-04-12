-- Fix booking expiration: expire at event END time, not start time
-- A booking should only expire after the event has fully ended
-- End time = event_date + duration_hours (falls back to event_date if no duration)
-- event_date stores the full start datetime (date + start time from booking dialog)

CREATE OR REPLACE FUNCTION auto_expire_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE bookings
  SET
    status     = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('pending', 'accepted')
    AND payment_status = 'pending'
    AND event_date IS NOT NULL
    AND (
      -- If duration is known: expire after the event ends (start + duration)
      (duration_hours IS NOT NULL AND event_date + (duration_hours || ' hours')::INTERVAL < NOW())
      OR
      -- If no duration stored: expire after the start time (safe fallback)
      (duration_hours IS NULL AND event_date < NOW())
    );

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % booking(s) past their event end time', expired_count;
  END IF;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- Also update the expiration notification to show the correct end time
CREATE OR REPLACE FUNCTION notify_booking_expired()
RETURNS TRIGGER AS $$
DECLARE
  hirer_name    TEXT;
  musician_name TEXT;
  event_info    TEXT;
  end_time_str  TEXT;
BEGIN
  IF NEW.status = 'expired' AND OLD.status != 'expired' THEN

    SELECT full_name INTO hirer_name    FROM profiles WHERE user_id = NEW.hirer_id;
    SELECT full_name INTO musician_name FROM profiles WHERE user_id = NEW.musician_id;

    -- Build event description with end time if available
    IF NEW.duration_hours IS NOT NULL THEN
      end_time_str := TO_CHAR(
        NEW.event_date + (NEW.duration_hours || ' hours')::INTERVAL,
        'HH24:MI'
      );
      event_info := COALESCE(NEW.event_type, 'Event') || ' on ' ||
                    TO_CHAR(NEW.event_date, 'Mon DD, YYYY') ||
                    ' (' || TO_CHAR(NEW.event_date, 'HH24:MI') || '–' || end_time_str || ')';
    ELSE
      event_info := COALESCE(NEW.event_type, 'Event') || ' on ' ||
                    TO_CHAR(NEW.event_date, 'Mon DD, YYYY');
    END IF;

    -- Notify hirer
    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    VALUES (
      NEW.hirer_id, 'booking', 'Booking Expired',
      'Your booking for ' || event_info || ' with ' || COALESCE(musician_name, 'the musician') ||
      ' has expired (unpaid/unaccepted).',
      '/hirer/bookings', FALSE
    );

    -- Notify musician
    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    VALUES (
      NEW.musician_id, 'booking', 'Booking Expired',
      'A booking request from ' || COALESCE(hirer_name, 'a client') ||
      ' for ' || event_info || ' has expired.',
      '/musician/bookings', FALSE
    );

  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_booking_expired error (ignored): %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_booking_expired ON bookings;
CREATE TRIGGER trigger_notify_booking_expired
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'expired' AND OLD.status IS DISTINCT FROM 'expired')
  EXECUTE FUNCTION notify_booking_expired();
