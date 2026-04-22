-- Improve booking notifications + add user tone preferences + cleanup duplicate rows.

-- 1) User-level notification tone preference
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notification_sound TEXT NOT NULL DEFAULT 'default';

COMMENT ON COLUMN public.user_settings.notification_sound IS
  'Preferred in-app notification sound key (default, chime, bell, soft).';

-- 2) Ensure hirer/admin get notified when musician accepts booking.
-- App currently moves accepted bookings to status = upcoming.
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    hirer_name TEXT;
    notification_title TEXT;
    notification_content TEXT;
    recipient_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
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
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'create_booking_notification error (ignored): %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Admin notification coverage: booking made, paid, accepted, confirmed, completed.
CREATE OR REPLACE FUNCTION public.notify_admins_on_booking_change()
RETURNS TRIGGER AS $$
DECLARE
    musician_name TEXT;
    hirer_name    TEXT;
BEGIN
    SELECT full_name INTO musician_name FROM profiles WHERE user_id = NEW.musician_id;
    SELECT full_name INTO hirer_name    FROM profiles WHERE user_id = NEW.hirer_id;

    -- Booking created
    IF TG_OP = 'INSERT' THEN
        PERFORM notify_admins(
            'booking',
            '📝 New Booking Created',
            COALESCE(hirer_name, 'Hirer') || ' created a booking with ' || COALESCE(musician_name, 'Musician') ||
            ' for ' || COALESCE(NEW.event_type, 'an event') || '.',
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status, 'payment_status', NEW.payment_status)
        );
    END IF;

    -- Payment made
    IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid')
       OR (TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid') THEN
        PERFORM notify_admins(
            'payment',
            '💰 Booking Payment Received',
            COALESCE(hirer_name, 'Hirer') || ' paid for a booking with ' || COALESCE(musician_name, 'Musician') ||
            ' — ₵' || NEW.total_amount,
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id, 'amount', NEW.total_amount)
        );
    END IF;

    -- Booking accepted (status upgraded to upcoming or accepted)
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status IN ('accepted', 'upcoming') THEN
        PERFORM notify_admins(
            'booking',
            '✅ Booking Accepted',
            COALESCE(musician_name, 'Musician') || ' accepted a booking from ' || COALESCE(hirer_name, 'Hirer') || '.',
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
        );
    END IF;

    -- Both parties confirmed service rendered
    IF TG_OP = 'UPDATE'
       AND (
            OLD.service_confirmed_by_hirer IS DISTINCT FROM NEW.service_confirmed_by_hirer
            OR OLD.service_confirmed_by_musician IS DISTINCT FROM NEW.service_confirmed_by_musician
       )
       AND NEW.service_confirmed_by_hirer = TRUE
       AND NEW.service_confirmed_by_musician = TRUE THEN
        PERFORM notify_admins(
            'booking',
            '🤝 Service Confirmed by Both Parties',
            COALESCE(hirer_name, 'Hirer') || ' and ' || COALESCE(musician_name, 'Musician') ||
            ' have both confirmed service completion.',
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id)
        );
    END IF;

    -- Booking completed
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
        PERFORM notify_admins(
            'booking',
            '✅ Booking Completed',
            COALESCE(musician_name,'Musician') || ' completed service for ' || COALESCE(hirer_name,'Hirer') ||
            ' — ₵' || NEW.total_amount,
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id, 'amount', NEW.total_amount)
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_booking_change error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Cleanup old duplicate notifications (safe windowed dedupe).
-- Keep the oldest row per fingerprint in a 90-second bucket.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        type,
        COALESCE(title, ''),
        COALESCE(content, ''),
        COALESCE(action_url, ''),
        FLOOR(EXTRACT(EPOCH FROM created_at) / 90)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM notifications
)
DELETE FROM notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;
