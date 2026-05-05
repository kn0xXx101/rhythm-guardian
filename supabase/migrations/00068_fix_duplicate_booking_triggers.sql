-- Two AFTER INSERT OR UPDATE triggers both pointed at create_booking_notification():
--   on_booking_change (from older migrations) + trigger_create_booking_notification (00061).
-- Each booking UPDATE ran the function twice → duplicate "Service Confirmed" rows, etc.

DROP TRIGGER IF EXISTS on_booking_change ON public.bookings;

-- Guard: one hirer→musician "Service Confirmed" per booking within a short window (race safety).
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    hirer_name TEXT;
    musician_name TEXT;
    notification_title TEXT;
    notification_content TEXT;
    recipient_id UUID;
BEGIN
    SELECT COALESCE(full_name, 'A client') INTO hirer_name
    FROM profiles WHERE user_id = NEW.hirer_id;

    SELECT COALESCE(full_name, 'A musician') INTO musician_name
    FROM profiles WHERE user_id = NEW.musician_id;

    IF TG_OP = 'INSERT' THEN
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
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'accepted', 'upcoming' THEN
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

        IF OLD.service_confirmed_by_musician IS DISTINCT FROM NEW.service_confirmed_by_musician
           AND NEW.service_confirmed_by_musician = TRUE THEN
            INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
            VALUES (
                NEW.hirer_id,
                'booking',
                '✅ Service Rendered',
                musician_name || ' has marked the service as rendered. Please confirm completion to release payment.',
                '/hirer/bookings?id=' || NEW.id,
                jsonb_build_object(
                    'booking_id', NEW.id,
                    'musician_id', NEW.musician_id,
                    'action_required', true
                )
            );
        END IF;

        IF OLD.service_confirmed_by_hirer IS DISTINCT FROM NEW.service_confirmed_by_hirer
           AND NEW.service_confirmed_by_hirer = TRUE THEN
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = NEW.musician_id
                  AND n.type = 'booking'
                  AND n.title = '🎉 Service Confirmed'
                  AND (n.metadata->>'booking_id') = NEW.id::text
                  AND n.created_at > NOW() - INTERVAL '5 minutes'
            ) THEN
                INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
                VALUES (
                    NEW.musician_id,
                    'booking',
                    '🎉 Service Confirmed',
                    hirer_name || ' has confirmed the service completion. Your payout will be processed soon.',
                    '/musician/bookings?id=' || NEW.id,
                    jsonb_build_object(
                        'booking_id', NEW.id,
                        'hirer_id', NEW.hirer_id,
                        'amount', NEW.musician_payout,
                        'payout_pending', true
                    )
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'create_booking_notification error (ignored): %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.create_booking_notification IS
  'Single-trigger booking notifications; duplicate on_booking_change trigger removed in 00068.';
