-- Admin notifications for messages and support tickets
-- Run in: https://supabase.com/dashboard/project/vptqcceuufmgwahrimor/sql/new

-- ── Notify admins when a new message is sent between users ───────────────────
CREATE OR REPLACE FUNCTION notify_admins_on_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    receiver_name TEXT;
BEGIN
    -- Only notify for non-admin messages (admin messages are already visible)
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.sender_id AND role = 'admin') THEN
        RETURN NEW;
    END IF;

    SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
    SELECT full_name INTO receiver_name FROM profiles WHERE user_id = NEW.receiver_id;

    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    SELECT user_id,
           'message',
           '💬 New Message',
           COALESCE(sender_name, 'A user') || ' sent a message to ' || COALESCE(receiver_name, 'another user'),
           '/admin/communications',
           FALSE
    FROM profiles WHERE role = 'admin';

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_message error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_message ON messages;
CREATE TRIGGER trigger_notify_admins_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_message();


-- ── Notify admins when a support ticket is created ───────────────────────────
CREATE OR REPLACE FUNCTION notify_admins_on_support_ticket()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    SELECT full_name INTO user_name FROM profiles WHERE user_id = NEW.user_id;

    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    SELECT user_id,
           'system',
           '🎫 New Support Ticket',
           COALESCE(user_name, 'A user') || ' opened a support ticket: "' || LEFT(NEW.subject, 80) || '"',
           '/admin/support?ticket=' || NEW.id,
           FALSE
    FROM profiles WHERE role = 'admin';

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_support_ticket error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_support_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_admins_on_support_ticket
    AFTER INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_support_ticket();


-- ── Notify admins when a dispute is filed ────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_admins_on_dispute()
RETURNS TRIGGER AS $$
DECLARE
    filer_name TEXT;
BEGIN
    SELECT full_name INTO filer_name FROM profiles WHERE user_id = NEW.filed_by;

    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    SELECT user_id,
           'system',
           '⚠️ New Dispute Filed',
           COALESCE(filer_name, 'A user') || ' filed a dispute: "' || LEFT(NEW.reason, 80) || '"',
           '/admin/bookings',
           FALSE
    FROM profiles WHERE role = 'admin';

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_dispute error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_dispute ON disputes;
CREATE TRIGGER trigger_notify_admins_on_dispute
    AFTER INSERT ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_dispute();


-- ── Notify admins when a review is submitted ─────────────────────────────────
CREATE OR REPLACE FUNCTION notify_admins_on_review_submitted()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_name TEXT;
    reviewee_name TEXT;
BEGIN
    SELECT full_name INTO reviewer_name FROM profiles WHERE user_id = NEW.reviewer_id;
    SELECT full_name INTO reviewee_name FROM profiles WHERE user_id = NEW.reviewee_id;

    INSERT INTO notifications (user_id, type, title, content, action_url, read)
    SELECT user_id,
           'review',
           '⭐ New Review',
           COALESCE(reviewer_name, 'A user') || ' left a ' || NEW.rating || '-star review for ' || COALESCE(reviewee_name, 'a musician'),
           '/admin/bookings',
           FALSE
    FROM profiles WHERE role = 'admin';

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_on_review_submitted error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_review_submitted ON reviews;
CREATE TRIGGER trigger_notify_admins_on_review_submitted
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_on_review_submitted();

SELECT 'Admin notification triggers for messages, tickets, disputes, reviews installed' AS status;
