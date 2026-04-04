-- Add admin notifications for important booking events

-- ============================================================================
-- Function to notify all admins
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admins(
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    -- Insert notification for all admin users
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
    SELECT 
        user_id,
        p_type::notification_type,
        p_title,
        p_content,
        p_action_url,
        p_metadata
    FROM profiles
    WHERE role = 'admin';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to notify admins on booking status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admins_on_booking_change()
RETURNS TRIGGER AS $$
DECLARE
    musician_name TEXT;
    hirer_name TEXT;
    event_type TEXT;
BEGIN
    -- Get musician and hirer names
    SELECT full_name INTO musician_name FROM profiles WHERE user_id = NEW.musician_id;
    SELECT full_name INTO hirer_name FROM profiles WHERE user_id = NEW.hirer_id;
    
    -- Notify on new booking (payment made)
    IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') OR 
       (TG_OP = 'UPDATE' AND OLD.payment_status != 'paid' AND NEW.payment_status = 'paid') THEN
        
        -- Notify admins
        PERFORM notify_admins(
            'payment',
            '💰 New Booking Payment',
            hirer_name || ' booked ' || musician_name || ' for ' || COALESCE(NEW.event_type, 'an event'),
            '/admin/bookings?id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'musician_id', NEW.musician_id,
                'hirer_id', NEW.hirer_id,
                'amount', NEW.total_amount
            )
        );
        
        -- Notify hirer of successful payment
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.hirer_id,
            'payment',
            '✅ Payment Successful',
            'Your payment of ₵' || NEW.total_amount || ' for ' || musician_name || ' has been processed successfully.',
            '/hirer/bookings?id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'musician_id', NEW.musician_id,
                'amount', NEW.total_amount
            )
        );
        
        -- Notify musician of new booking
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.musician_id,
            'booking',
            '🎵 New Booking Received',
            hirer_name || ' has booked you for ' || COALESCE(NEW.event_type, 'an event') || ' on ' || TO_CHAR(NEW.event_date, 'Mon DD, YYYY'),
            '/musician/bookings?id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'hirer_id', NEW.hirer_id,
                'amount', NEW.total_amount
            )
        );
    END IF;
    
    -- Notify on musician marking service as rendered
    IF TG_OP = 'UPDATE' AND OLD.service_confirmed_by_musician = FALSE AND NEW.service_confirmed_by_musician = TRUE THEN
        
        -- Notify hirer that musician marked service as rendered
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.hirer_id,
            'booking',
            '✅ Service Rendered',
            musician_name || ' has marked the service as rendered. Please confirm completion.',
            '/hirer/bookings?id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'musician_id', NEW.musician_id
            )
        );
    END IF;
    
    -- Notify on hirer confirming service completion
    IF TG_OP = 'UPDATE' AND OLD.service_confirmed_by_hirer = FALSE AND NEW.service_confirmed_by_hirer = TRUE THEN
        
        -- Notify musician that hirer confirmed completion
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
                'amount', NEW.musician_payout
            )
        );
    END IF;
    
    -- Notify on booking completion
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        PERFORM notify_admins(
            'booking',
            '✅ Service Completed',
            musician_name || ' completed service for ' || hirer_name,
            '/admin/bookings?id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'musician_id', NEW.musician_id,
                'hirer_id', NEW.hirer_id,
                'amount', NEW.total_amount
            )
        );
    END IF;
    
    -- Notify on payout release
    IF TG_OP = 'UPDATE' AND OLD.payout_released = FALSE AND NEW.payout_released = TRUE THEN
        PERFORM notify_admins(
            'payout',
            '💸 Payout Released',
            'Payout of ₵' || NEW.musician_payout || ' released to ' || musician_name,
            '/admin/transactions?booking_id=' || NEW.id,
            jsonb_build_object(
                'booking_id', NEW.id,
                'musician_id', NEW.musician_id,
                'amount', NEW.musician_payout
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to notify admins on new reviews
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admins_on_review()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_name TEXT;
    reviewee_name TEXT;
BEGIN
    -- Get reviewer and reviewee names
    SELECT full_name INTO reviewer_name FROM profiles WHERE user_id = NEW.reviewer_id;
    SELECT full_name INTO reviewee_name FROM profiles WHERE user_id = NEW.reviewee_id;
    
    -- Notify admins of new review
    PERFORM notify_admins(
        'review',
        '⭐ New Review',
        reviewer_name || ' left a ' || NEW.rating || '-star review for ' || reviewee_name,
        '/admin/bookings?id=' || NEW.booking_id,
        jsonb_build_object(
            'review_id', NEW.id,
            'booking_id', NEW.booking_id,
            'reviewer_id', NEW.reviewer_id,
            'reviewee_id', NEW.reviewee_id,
            'rating', NEW.rating
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create triggers
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_admins_on_booking ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_admins_on_review ON reviews;

-- Trigger for booking changes
CREATE TRIGGER trigger_notify_admins_on_booking
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_booking_change();

-- Trigger for new reviews
CREATE TRIGGER trigger_notify_admins_on_review
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_review();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION notify_admins IS 'Sends notifications to all admin users';
COMMENT ON FUNCTION notify_admins_on_booking_change IS 'Notifies admins when bookings are paid, completed, or payouts are released';
COMMENT ON FUNCTION notify_admins_on_review IS 'Notifies admins when new reviews are submitted';
