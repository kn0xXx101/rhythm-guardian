-- Fix Supabase Security Warnings
-- This migration addresses security linter warnings by:
-- 1. Setting search_path for functions to prevent search path manipulation
-- 2. Restricting access to SECURITY DEFINER functions
-- 3. Revoking unnecessary permissions from anon and authenticated roles

-- ============================================================================
-- Fix Function Search Path Mutable Issues
-- ============================================================================

-- Fix notify_admins function
DROP FUNCTION IF EXISTS notify_admins(text,text,text,text,jsonb);
CREATE OR REPLACE FUNCTION notify_admins(
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_action_url TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix notify_admins_on_booking_change function
CREATE OR REPLACE FUNCTION notify_admins_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix notify_admins_on_review function
CREATE OR REPLACE FUNCTION notify_admins_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================================================
-- Revoke Unnecessary Permissions from anon and authenticated roles
-- ============================================================================

-- Revoke EXECUTE permissions from anon role for SECURITY DEFINER functions
-- These functions should only be accessible to authenticated users or specific roles

REVOKE EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION apply_message_content_auto_flag() FROM anon;
REVOKE EXECUTE ON FUNCTION auto_close_expired_tickets() FROM anon;
REVOKE EXECUTE ON FUNCTION can_users_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION check_musician_availability(uuid, timestamp with time zone, numeric, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION cleanup_expired_support_tickets() FROM anon;
REVOKE EXECUTE ON FUNCTION complete_referral_signup(text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_service(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_message_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION create_notification(uuid, notification_type, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION create_profile_for_user() FROM anon;
REVOKE EXECUTE ON FUNCTION ensure_conversation_exists() FROM anon;
REVOKE EXECUTE ON FUNCTION get_new_ticket_messages(uuid, timestamp with time zone, text) FROM anon;
REVOKE EXECUTE ON FUNCTION get_support_tickets() FROM anon;
REVOKE EXECUTE ON FUNCTION get_ticket_messages(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_active_tickets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_active_tickets_with_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION handle_booking_accepted_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_booking_created_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION is_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION mark_conversation_read(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_message_read(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION send_message(uuid, uuid, text, text, text, text, integer, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION update_ticket_session_on_admin_response(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION update_ticket_session_on_user_response(uuid) FROM anon;

-- Revoke admin-only functions from authenticated role (these should only be accessible to admins)
REVOKE EXECUTE ON FUNCTION apply_message_content_auto_flag() FROM authenticated;
REVOKE EXECUTE ON FUNCTION auto_close_expired_tickets() FROM authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_expired_support_tickets() FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_support_tickets() FROM authenticated;
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM authenticated;

-- ============================================================================
-- Grant appropriate permissions
-- ============================================================================

-- Grant permissions to authenticated users for functions they should access
GRANT EXECUTE ON FUNCTION add_ticket_message(uuid, text, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION can_users_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_musician_availability(uuid, timestamp with time zone, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_referral_signup(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_service(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, notification_type, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_profile_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_conversation_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_ticket_messages(uuid, timestamp with time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tickets_with_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_booking_accepted_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_booking_created_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(uuid, uuid, text, text, text, text, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_session_on_admin_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_session_on_user_response(uuid) TO authenticated;

-- ============================================================================
-- Create admin role if it doesn't exist and grant admin-only permissions
-- ============================================================================

DO $$
BEGIN
    -- Create admin role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role;
    END IF;
END
$$;

-- Grant admin-only functions to admin role
GRANT EXECUTE ON FUNCTION apply_message_content_auto_flag() TO admin_role;
GRANT EXECUTE ON FUNCTION auto_close_expired_tickets() TO admin_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_support_tickets() TO admin_role;
GRANT EXECUTE ON FUNCTION get_support_tickets() TO admin_role;
GRANT EXECUTE ON FUNCTION rls_auto_enable() TO admin_role;
GRANT EXECUTE ON FUNCTION notify_admins(text, text, text, text, jsonb) TO admin_role;

-- ============================================================================
-- Ensure create_booking_notification function has proper search path
-- ============================================================================

-- This function handles individual confirmation notifications
-- Make sure it has the proper search path set
DO $$
BEGIN
    -- Check if the function exists and set search path
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_booking_notification') THEN
        ALTER FUNCTION create_booking_notification() SET search_path = public;
    END IF;
END
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION notify_admins IS 'Sends notifications to all admin users - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION notify_admins_on_booking_change IS 'Notifies admins when bookings are paid, completed, or payouts are released - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION notify_admins_on_review IS 'Notifies admins when new reviews are submitted - SECURITY DEFINER with fixed search_path';

-- ============================================================================
-- Enable leaked password protection (if not already enabled)
-- ============================================================================

-- Note: This needs to be done in the Supabase dashboard under Auth settings
-- The SQL command would be something like:
-- ALTER SYSTEM SET auth.enable_leaked_password_protection = 'on';
-- But this is typically configured through the Supabase dashboard