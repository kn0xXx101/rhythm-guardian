-- Fix the 4 remaining function_search_path_mutable warnings
-- by recreating the functions with SET search_path = public

CREATE OR REPLACE FUNCTION public.update_ticket_session_on_admin_response(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE support_tickets
    SET
        session_status = 'active',
        last_activity_at = NOW(),
        session_expires_at = NOW() + INTERVAL '5 minutes',
        first_response_at = COALESCE(first_response_at, NOW()),
        status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
    WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ticket_session_on_user_response(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE support_tickets
    SET
        session_status = 'active',
        last_activity_at = NOW(),
        session_expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_ticket_message(
    p_ticket_id uuid,
    p_sender_type text,
    p_sender_id uuid,
    p_content text,
    p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id uuid;
    v_sender_name text;
    v_user_id uuid;
    v_ticket_subject text;
BEGIN
    SELECT full_name INTO v_sender_name FROM profiles WHERE user_id = p_sender_id;
    SELECT user_id, subject INTO v_user_id, v_ticket_subject FROM support_tickets WHERE id = p_ticket_id;

    INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, is_internal)
    VALUES (p_ticket_id, p_sender_type, p_sender_id, COALESCE(v_sender_name, 'User'), p_content, COALESCE(p_is_internal, false))
    RETURNING id INTO v_message_id;

    IF p_sender_type = 'admin' AND NOT COALESCE(p_is_internal, false) THEN
        PERFORM update_ticket_session_on_admin_response(p_ticket_id);
        INSERT INTO notifications (user_id, type, title, content, action_url, read)
        VALUES (v_user_id, 'system', 'Admin Response', 'An administrator responded to your support request.', '/messages?ai_assistant=true', false);
    ELSIF p_sender_type = 'user' THEN
        PERFORM update_ticket_session_on_user_response(p_ticket_id);
        INSERT INTO notifications (user_id, type, title, content, action_url, read)
        SELECT p.user_id, 'system', 'User Response',
               'User responded to support ticket "' || v_ticket_subject || '".',
               '/admin/support?ticket=' || p_ticket_id, false
        FROM profiles p WHERE p.role = 'admin';
    END IF;

    RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_new_ticket_messages(
    p_ticket_id uuid,
    p_since timestamptz,
    p_sender_type text
)
RETURNS TABLE (id uuid, sender_name text, content text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT tm.id, tm.sender_name, tm.content, tm.created_at
    FROM ticket_messages tm
    WHERE tm.ticket_id = p_ticket_id
      AND tm.sender_type = p_sender_type
      AND tm.created_at > p_since
    ORDER BY tm.created_at ASC;
END;
$$;

SELECT 'Final search_path fixes applied' AS status;
