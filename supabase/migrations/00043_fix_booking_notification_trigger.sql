-- Fix: Replace create_booking_notification trigger function
-- The live DB has a version that calls create_notification() which doesn't exist.
-- This replaces it with a safe version using direct INSERTs.

CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    hirer_name TEXT;
    notification_title TEXT;
    notification_content TEXT;
    recipient_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New booking: notify musician
        SELECT COALESCE(full_name, 'A client') INTO hirer_name
        FROM profiles WHERE user_id = NEW.hirer_id;

        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.musician_id,
            'booking',
            'New Booking Request',
            hirer_name || ' sent you a booking request for ' || COALESCE(NEW.event_type, 'an event'),
            '/musician/bookings',
            jsonb_build_object('booking_id', NEW.id)
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Status change notifications
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'accepted' THEN
                    notification_title   := 'Booking Accepted';
                    notification_content := 'Your booking request has been accepted';
                    recipient_id         := NEW.hirer_id;
                WHEN 'rejected' THEN
                    notification_title   := 'Booking Declined';
                    notification_content := 'Your booking request was declined';
                    recipient_id         := NEW.hirer_id;
                WHEN 'completed' THEN
                    notification_title   := 'Booking Completed';
                    notification_content := 'Your booking has been marked as completed';
                    recipient_id         := NEW.hirer_id;
                WHEN 'cancelled' THEN
                    notification_title   := 'Booking Cancelled';
                    notification_content := 'A booking has been cancelled';
                    recipient_id         := CASE
                        WHEN NEW.cancellation_requested_by = NEW.hirer_id THEN NEW.musician_id
                        ELSE NEW.hirer_id
                    END;
                ELSE
                    recipient_id := NULL;
            END CASE;

            IF recipient_id IS NOT NULL THEN
                INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
                VALUES (
                    recipient_id,
                    'booking',
                    notification_title,
                    notification_content,
                    '/bookings',
                    jsonb_build_object('booking_id', NEW.id)
                );
            END IF;
        END IF;

        -- Payment status change: notify musician
        IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
            INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
            VALUES (
                NEW.musician_id,
                'payment',
                'Payment Received',
                'Payment received for ' || COALESCE(NEW.event_type, 'your booking'),
                '/musician/bookings',
                jsonb_build_object('booking_id', NEW.id)
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Never block a booking operation due to notification failure
        RAISE WARNING 'create_booking_notification error (ignored): %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_booking_change ON bookings;
CREATE TRIGGER on_booking_change
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_booking_notification();
