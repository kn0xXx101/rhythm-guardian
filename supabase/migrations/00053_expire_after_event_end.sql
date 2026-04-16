-- Expire accepted / in-progress bookings once the event window (start + duration) has passed,
-- not only pending requests (which use auto_expire_pending_bookings + event_date < now).

CREATE OR REPLACE FUNCTION auto_expire_past_event_window()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE bookings
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('in_progress', 'accepted')
    AND event_date IS NOT NULL
    AND (
      event_date + (COALESCE(NULLIF(duration_hours, 0), 1) || ' hours')::interval
    ) < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % booking(s) past event end (in_progress/accepted)', expired_count;
  END IF;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_and_expire_bookings()
RETURNS TABLE (
  expired_count INTEGER,
  message TEXT
) AS $$
DECLARE
  c_pending INTEGER;
  c_window INTEGER;
  total INTEGER;
BEGIN
  SELECT auto_expire_pending_bookings() INTO c_pending;
  SELECT auto_expire_past_event_window() INTO c_window;
  total := COALESCE(c_pending, 0) + COALESCE(c_window, 0);

  RETURN QUERY
  SELECT
    total,
    CASE
      WHEN total > 0 THEN 'Expired ' || total || ' booking(s)'
      ELSE 'No bookings to expire'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_expire_past_event_window() IS
  'Marks in_progress/accepted bookings expired after event_date + duration_hours has passed';
