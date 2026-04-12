-- Prevent double-booking musicians for overlapping time slots
-- A musician cannot have two active bookings that overlap in time

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_musician_availability(
    p_musician_id UUID,
    p_event_date TIMESTAMPTZ,
    p_duration_hours DECIMAL,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    p_end_time TIMESTAMPTZ;
    conflict_count INTEGER;
BEGIN
    -- Calculate end time of the new booking
    p_end_time := p_event_date + (p_duration_hours || ' hours')::INTERVAL;

    -- Check for overlapping bookings (active statuses only)
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE musician_id = p_musician_id
      AND status IN ('pending', 'accepted', 'confirmed', 'in_progress')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND event_date IS NOT NULL
      AND duration_hours IS NOT NULL
      -- Overlap condition: new booking starts before existing ends AND new booking ends after existing starts
      AND p_event_date < (event_date + (duration_hours || ' hours')::INTERVAL)
      AND p_end_time > event_date;

    RETURN conflict_count = 0; -- TRUE means available, FALSE means conflict
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to enforce no double-booking on insert/update
CREATE OR REPLACE FUNCTION enforce_no_double_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check active bookings
    IF NEW.status NOT IN ('pending', 'accepted', 'confirmed', 'in_progress') THEN
        RETURN NEW;
    END IF;

    -- Skip if missing required fields
    IF NEW.event_date IS NULL OR NEW.duration_hours IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check for conflicts
    IF NOT check_musician_availability(
        NEW.musician_id,
        NEW.event_date,
        NEW.duration_hours,
        CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
    ) THEN
        RAISE EXCEPTION 'BOOKING_CONFLICT: This musician is already booked during the requested time slot. Please choose a different date or time.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS prevent_double_booking ON bookings;
CREATE TRIGGER prevent_double_booking
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION enforce_no_double_booking();

COMMENT ON FUNCTION check_musician_availability IS 'Returns TRUE if musician is available for the given time slot, FALSE if there is a conflict';
COMMENT ON TRIGGER prevent_double_booking ON bookings IS 'Prevents double-booking musicians for overlapping time slots';