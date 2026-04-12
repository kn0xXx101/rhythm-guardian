-- ============================================================================
-- Comprehensive Admin Notifications
-- Admins receive notifications for:
--   1. New booking created (payment made)
--   2. Booking expired (pending or accepted-unpaid)
--   3. Booking cancelled / rejected
--   4. Booking completed + payout released
--   5. Payment received
--   6. Musician submits verification documents
-- ============================================================================

-- Helper: insert a notification for every admin user
CREATE OR REPLACE FUNCTION notify_admins(
    p_type    TEXT,
    p_title   TEXT,
    p_content TEXT,
    p_url     TEXT,
    p_meta    JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata, read)
    SELECT user_id,
           p_type::notification_type,
           p_title,
           p_content,
           p_url,
           p_meta,
           FALSE
    FROM profiles
    WHERE role = 'admin';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins error (ignored): %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Booking events → admin notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_admins_on_booking_change()
RETURNS TRIGGER AS $$
DECLARE
    musician_name TEXT;
    hirer_name    TEXT;
BEGIN
    SELECT full_name INTO musician_name FROM profiles WHERE user_id = NEW.musician_id;
    SELECT full_name INTO hirer_name    FROM profiles WHERE user_id = NEW.hirer_id;

    -- New booking with payment
    IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid')
    OR (TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid') THEN

        PERFORM notify_admins(
            'payment',
            '💰 New Booking Payment',
            COALESCE(hirer_name,'Hirer') || ' booked ' || COALESCE(musician_name,'Musician') ||
            ' for ' || COALESCE(NEW.event_type,'an event') || ' — ₵' || NEW.total_amount,
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id, 'amount', NEW.total_amount)
        );

        -- Notify hirer: payment confirmed
        INSERT INTO notifications (user_id, type, title, content, action_url, read)
        VALUES (NEW.hirer_id, 'payment', '✅ Payment Confirmed',
            'Your payment of ₵' || NEW.total_amount || ' for ' || COALESCE(musician_name,'the musician') || ' has been received.',
            '/hirer/bookings', FALSE);

        -- Notify musician: new booking
        INSERT INTO notifications (user_id, type, title, content, action_url, read)
        VALUES (NEW.musician_id, 'booking', '🎵 New Booking',
            COALESCE(hirer_name,'A client') || ' booked you for ' || COALESCE(NEW.event_type,'an event') ||
            ' on ' || TO_CHAR(NEW.event_date, 'Mon DD, YYYY'),
            '/musician/bookings', FALSE);
    END IF;

    -- Booking expired
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'expired' THEN
        PERFORM notify_admins(
            'booking',
            '⏰ Booking Expired',
            'Booking between ' || COALESCE(hirer_name,'Hirer') || ' and ' || COALESCE(musician_name,'Musician') ||
            ' expired (unpaid/unaccepted).',
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id)
        );
    END IF;

    -- Booking cancelled
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
        PERFORM notify_admins(
            'booking',
            '❌ Booking Cancelled',
            'Booking between ' || COALESCE(hirer_name,'Hirer') || ' and ' || COALESCE(musician_name,'Musician') || ' was cancelled.',
            '/admin/bookings',
            jsonb_build_object('booking_id', NEW.id)
        );
    END IF;

    -- Booking rejected by musician
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
        PERFORM notify_admins(
            'booking',
            '🚫 Booking Rejected',
            COALESCE(musician_name,'Musician') || ' rejected a booking from ' || COALESCE(hirer_name,'Hirer') || '.',
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

    -- Payout released
    IF TG_OP = 'UPDATE' AND (OLD.payout_released IS DISTINCT FROM NEW.payout_released) AND NEW.payout_released = TRUE THEN
        PERFORM notify_admins(
            'payout',
            '💸 Payout Released',
            'Payout of ₵' || COALESCE(NEW.musician_payout, NEW.total_amount) ||
            ' released to ' || COALESCE(musician_name,'Musician'),
            '/admin/transactions',
            jsonb_build_object('booking_id', NEW.id, 'amount', NEW.musician_payout)
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_booking_change error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_booking ON bookings;
CREATE TRIGGER trigger_notify_admins_on_booking
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_booking_change();

-- ============================================================================
-- Document submission → admin notification
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_admins_on_document_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Musician just submitted documents for the first time
    IF OLD.documents_submitted IS DISTINCT FROM NEW.documents_submitted
       AND NEW.documents_submitted = TRUE
       AND NEW.documents_verified = FALSE THEN

        PERFORM notify_admins(
            'system',
            '📄 Verification Documents Submitted',
            COALESCE(NEW.full_name, 'A musician') || ' has submitted identity documents for verification.',
            '/admin/verifications',
            jsonb_build_object('user_id', NEW.user_id)
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_document_submission error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_document_submission ON profiles;
CREATE TRIGGER trigger_notify_admins_on_document_submission
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_document_submission();

-- ============================================================================
-- New user registration → admin notification
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_admins_on_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role != 'admin' THEN
        PERFORM notify_admins(
            'system',
            '👤 New User Registered',
            COALESCE(NEW.full_name, NEW.email, 'A new user') || ' registered as ' || NEW.role || '.',
            '/admin/users',
            jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_new_user error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_user ON profiles;
CREATE TRIGGER trigger_notify_admins_on_new_user
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_new_user();
