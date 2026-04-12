-- Fix booking expiration to also expire accepted-but-unpaid bookings
-- When event date passes and payment_status is still 'pending', expire the booking

CREATE OR REPLACE FUNCTION auto_expire_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Expire bookings where:
  -- 1. Status is 'pending' OR 'accepted' (musician accepted but hirer never paid)
  -- 2. payment_status is still 'pending' (no payment made)
  -- 3. Event date has passed
  UPDATE bookings
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('pending', 'accepted')
    AND payment_status = 'pending'
    AND event_date < NOW()
    AND event_date IS NOT NULL;

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % booking(s) (pending/accepted-unpaid) past event date', expired_count;
  END IF;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
