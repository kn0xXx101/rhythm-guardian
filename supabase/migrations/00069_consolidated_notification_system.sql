-- 00069_consolidated_notification_system.sql
-- Consolidates all booking, admin, message, review, and profile notification triggers into a single, robust system.
-- Fixes double-underscore typos and removes redundant triggers.

-- 1. Ensure the correct types and tables exist
DO $$ 
BEGIN
    -- Drop existing functions with all possible signatures to avoid ambiguity
    DROP FUNCTION IF EXISTS public.create_notification(uuid, notification_type, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, text);
    
    DROP FUNCTION IF EXISTS public.notify_admins(text, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS public.notify_admins(text, text, text, text);
    
    DROP FUNCTION IF EXISTS public.create__notification(uuid, notification_type, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS public.create__notification(uuid, text, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS public.create__notification(uuid, notification__type, text, text, text, jsonb);

    -- Ensure notification_type enum exists with correct single-underscore name
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('system', 'booking', 'payment', 'message', 'review', 'payout');
    END IF;
    
    -- Ensure legacy notification__type exists to prevent "function does not exist" errors
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification__type') THEN
        CREATE TYPE notification__type AS ENUM ('system', 'booking', 'payment', 'message', 'review', 'payout');
    END IF;

    -- Ensure waiting_list table exists for regional restrictions
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waiting_list') THEN
        CREATE TABLE public.waiting_list (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            source TEXT DEFAULT 'geo_restriction',
            created_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(email)
        );
        -- Basic RLS for waiting_list
        ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow anonymous insertions to waiting_list" ON public.waiting_list FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow admins to view waiting_list" ON public.waiting_list FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- 2. Consolidate create_notification function (single point of entry for all manual notifications)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT, -- Use TEXT to be flexible with enum casting
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (
        p_user_id, 
        p_type::notification_type, 
        p_title, 
        p_content, 
        p_action_url, 
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Consolidate notify_admins function
CREATE OR REPLACE FUNCTION public.notify_admins(
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    SELECT 
        user_id,
        p_type::notification_type,
        p_title,
        p_content,
        p_action_url,
        COALESCE(p_metadata, '{}'::jsonb)
    FROM public.profiles
    WHERE role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Re-create create__notification (double underscore) as a proxy
-- Overload 1: Takes TEXT
CREATE OR REPLACE FUNCTION public.create__notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN public.create_notification(p_user_id, p_type, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Overload 2: Takes notification__type (legacy enum)
CREATE OR REPLACE FUNCTION public.create__notification(
    p_user_id UUID,
    p_type notification__type,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN public.create_notification(p_user_id, p_type::TEXT, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Overload 3: Takes notification_type (new enum)
CREATE OR REPLACE FUNCTION public.create__notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    RETURN public.create_notification(p_user_id, p_type::TEXT, p_title, p_content, p_action_url, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Consolidated booking trigger function (Admins + Hirer + Musician)
CREATE OR REPLACE FUNCTION public.handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
    hirer_name TEXT;
    musician_name TEXT;
    short_id TEXT;
BEGIN
    -- Get names for notifications
    SELECT COALESCE(full_name, 'A hirer') INTO hirer_name FROM public.profiles WHERE user_id = NEW.hirer_id;
    SELECT COALESCE(full_name, 'A musician') INTO musician_name FROM public.profiles WHERE user_id = NEW.musician_id;
    short_id := SUBSTRING(NEW.id::text, 1, 8);

    -- 5a. NEW BOOKING (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Notify Musician
        PERFORM public.create_notification(
            NEW.musician_id, 'booking', 'New Booking Request',
            hirer_name || ' sent you a booking request for ' || COALESCE(NEW.event_type, 'an event'),
            '/musician/bookings', jsonb_build_object('booking_id', NEW.id)
        );
        -- Notify Hirer
        PERFORM public.create_notification(
            NEW.hirer_id, 'booking', 'Booking Request Sent',
            'Your booking request for ' || musician_name || ' has been sent successfully.',
            '/hirer/bookings', jsonb_build_object('booking_id', NEW.id)
        );
        -- Notify Admins
        PERFORM public.notify_admins(
            'booking', '📝 New Booking Created',
            hirer_name || ' created a booking with ' || musician_name || ' (ID: ' || short_id || ')',
            '/admin/bookings', jsonb_build_object('booking_id', NEW.id)
        );
    END IF;

    -- 5b. STATUS UPDATES
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Notify Hirer when status changes
        IF NEW.status IN ('accepted', 'upcoming') THEN
            PERFORM public.create_notification(NEW.hirer_id, 'booking', '✅ Booking Accepted', musician_name || ' accepted your booking request.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
            PERFORM public.notify_admins('booking', '✅ Booking Accepted', musician_name || ' accepted booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_notification(NEW.hirer_id, 'booking', '❌ Booking Declined', musician_name || ' declined your booking request.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
            PERFORM public.notify_admins('booking', '❌ Booking Rejected', musician_name || ' rejected booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        ELSIF NEW.status = 'completed' THEN
            PERFORM public.create_notification(NEW.hirer_id, 'booking', '🎉 Booking Completed', 'Your booking with ' || musician_name || ' is complete.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
            PERFORM public.notify_admins('booking', '🎉 Booking Completed', 'Booking ' || short_id || ' marked as completed.', '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        ELSIF NEW.status = 'cancelled' THEN
            -- Notify the OTHER party
            IF NEW.cancellation_requested_by = NEW.hirer_id THEN
                PERFORM public.create_notification(NEW.musician_id, 'booking', '⚠️ Booking Cancelled', hirer_name || ' cancelled the booking.', '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
            ELSE
                PERFORM public.create_notification(NEW.hirer_id, 'booking', '⚠️ Booking Cancelled', musician_name || ' cancelled the booking.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
            END IF;
            PERFORM public.notify_admins('booking', '⚠️ Booking Cancelled', 'Booking ' || short_id || ' was cancelled.', '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        END IF;
    END IF;

    -- 5c. PAYMENT UPDATES
    IF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
        -- Notify Musician
        PERFORM public.create_notification(NEW.musician_id, 'payment', '💰 Payment Received', 'Payment received for ' || COALESCE(NEW.event_type, 'your booking'), '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
        -- Notify Hirer
        PERFORM public.create_notification(NEW.hirer_id, 'payment', '✅ Payment Successful', 'Your payment for ' || musician_name || ' has been processed.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
        -- Notify Admins
        PERFORM public.notify_admins('payment', '💰 Booking Payment Received', hirer_name || ' paid for booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id, 'amount', NEW.total_amount));
    END IF;

    -- 5d. SERVICE CONFIRMATION UPDATES
    IF TG_OP = 'UPDATE' THEN
        -- Musician marks rendered
        IF OLD.service_confirmed_by_musician IS DISTINCT FROM NEW.service_confirmed_by_musician AND NEW.service_confirmed_by_musician = TRUE THEN
            PERFORM public.create_notification(NEW.hirer_id, 'booking', '✅ Service Rendered', musician_name || ' marked service as rendered. Please confirm.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
        END IF;
        -- Hirer marks confirmed
        IF OLD.service_confirmed_by_hirer IS DISTINCT FROM NEW.service_confirmed_by_hirer AND NEW.service_confirmed_by_hirer = TRUE THEN
            PERFORM public.create_notification(NEW.musician_id, 'booking', '🎉 Service Confirmed', hirer_name || ' confirmed completion. Payout pending.', '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
        END IF;
        -- Both confirmed
        IF NEW.service_confirmed_by_hirer = TRUE AND NEW.service_confirmed_by_musician = TRUE AND (OLD.service_confirmed_by_hirer = FALSE OR OLD.service_confirmed_by_musician = FALSE) THEN
            PERFORM public.notify_admins('booking', '🤝 Service Fully Confirmed', 'Both parties confirmed booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        END IF;
    END IF;

    -- 5e. PAYOUT RELEASE
    IF TG_OP = 'UPDATE' AND OLD.payout_released IS DISTINCT FROM NEW.payout_released AND NEW.payout_released = TRUE THEN
        -- Notify Musician
        PERFORM public.create_notification(NEW.musician_id, 'payment', '💸 Payout Released', 'Your payout for booking ' || short_id || ' has been released.', '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
        -- Notify Admins
        PERFORM public.notify_admins('payment', '💸 Payout Released', 'Payout released for booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id, 'amount', NEW.musician_payout));
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_booking_notifications error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Consolidated profile notifications
CREATE OR REPLACE FUNCTION public.handle_profile_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- 6a. New User Registration
    IF TG_OP = 'INSERT' THEN
        PERFORM public.notify_admins(
            'system', '🆕 New User Registered',
            COALESCE(NEW.full_name, 'A new user') || ' joined as a ' || NEW.role,
            '/admin/users', jsonb_build_object('user_id', NEW.user_id)
        );
    END IF;

    -- 6b. Profile Status Changes (Approval/Rejection)
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'active' AND OLD.status = 'pending' THEN
            PERFORM public.create_notification(
                NEW.user_id, 'system', '✅ Profile Approved',
                'Your musician profile has been approved! You can now start receiving bookings.',
                '/musician/profile', NULL
            );
        ELSIF NEW.status = 'suspended' THEN
            PERFORM public.create_notification(
                NEW.user_id, 'system', '⚠️ Account Suspended',
                'Your account has been suspended. Please contact support.',
                NULL, NULL
            );
        END IF;
    END IF;

    -- 6c. Document Submission & Verification
    IF TG_OP = 'UPDATE' THEN
        -- Document submission
        IF OLD.documents_submitted IS DISTINCT FROM NEW.documents_submitted AND NEW.documents_submitted = TRUE THEN
            PERFORM public.notify_admins(
                'system', '📄 New Documents Submitted',
                COALESCE(NEW.full_name, 'A user') || ' submitted documents for verification.',
                '/admin/verifications', jsonb_build_object('user_id', NEW.user_id)
            );
        END IF;
        
        -- Verification Approval
        IF OLD.documents_verified IS DISTINCT FROM NEW.documents_verified AND NEW.documents_verified = TRUE THEN
            PERFORM public.create_notification(
                NEW.user_id, 'system', '✅ Verification Approved',
                'Congratulations! Your identity has been verified. You now have a verified badge on your profile.',
                '/musician/profile', NULL
            );
        END IF;

        -- Verification Rejection (when documents_submitted is set back to FALSE)
        IF OLD.documents_submitted = TRUE AND NEW.documents_submitted = FALSE AND NEW.documents_verified = FALSE THEN
            PERFORM public.create_notification(
                NEW.user_id, 'system', '❌ Verification Rejected',
                'Your verification was rejected. Please check your email or resubmit your documents.',
                '/musician/profile', NULL
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Consolidate review notifications
CREATE OR REPLACE FUNCTION public.handle_review_notifications()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_name TEXT;
    reviewee_name TEXT;
BEGIN
    SELECT COALESCE(full_name, 'Someone') INTO reviewer_name FROM public.profiles WHERE user_id = NEW.reviewer_id;
    SELECT COALESCE(full_name, 'A musician') INTO reviewee_name FROM public.profiles WHERE user_id = NEW.reviewee_id;

    -- Notify Reviewee
    PERFORM public.create_notification(
        NEW.reviewee_id, 'review', '⭐ New Review Received',
        reviewer_name || ' left you a ' || NEW.rating || '-star review.',
        '/musician/reviews', jsonb_build_object('review_id', NEW.id)
    );

    -- Notify Admins
    PERFORM public.notify_admins(
        'review', '⭐ New Review Submitted',
        reviewer_name || ' reviewed ' || reviewee_name || ' (' || NEW.rating || ' stars).',
        '/admin/reviews', jsonb_build_object('review_id', NEW.id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Consolidate support ticket notifications
CREATE OR REPLACE FUNCTION public.handle_support_notifications()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    SELECT COALESCE(full_name, 'A user') INTO user_name FROM public.profiles WHERE user_id = NEW.user_id;

    IF TG_OP = 'INSERT' THEN
        PERFORM public.notify_admins(
            'system', '🎫 New Support Ticket',
            user_name || ' opened a ticket: "' || LEFT(NEW.subject, 50) || '..."',
            '/admin/support?ticket=' || NEW.id, jsonb_build_object('ticket_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Cleanup all redundant triggers and set up consolidated ones
DO $$ 
DECLARE
    trig RECORD;
BEGIN
    -- Drop EVERY AFTER trigger on the bookings table first to ensure a clean slate
    FOR trig IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'bookings' AND trigger_schema = 'public' AND action_timing = 'AFTER') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trig.trigger_name || ' ON bookings';
    END LOOP;

    -- Drop EVERY AFTER trigger on the reviews table
    FOR trig IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'reviews' AND trigger_schema = 'public' AND action_timing = 'AFTER') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trig.trigger_name || ' ON reviews';
    END LOOP;

    -- Drop EVERY AFTER trigger on the profiles table
    FOR trig IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'profiles' AND trigger_schema = 'public' AND action_timing = 'AFTER') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trig.trigger_name || ' ON profiles';
    END LOOP;

    -- Specific cleanup for support_tickets
    DROP TRIGGER IF EXISTS trigger_notify_admins_on_support_ticket ON support_tickets;
    DROP TRIGGER IF EXISTS consolidated_support_notifications ON support_tickets;
END $$;

-- 10. Re-create consolidated triggers
CREATE TRIGGER consolidated_booking_notifications
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_booking_notifications();

CREATE TRIGGER consolidated_profile_notifications
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_notifications();

CREATE TRIGGER consolidated_review_notifications
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_review_notifications();

CREATE TRIGGER consolidated_support_notifications
    AFTER INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_support_notifications();

-- 11. Final Permissions
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, notification__type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create__notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
