-- Fix: Remove SECURITY DEFINER from views
-- Both views must use security_invoker so RLS policies of the querying user are enforced

-- ── milestone_progress ──────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.milestone_progress CASCADE;

CREATE OR REPLACE VIEW public.milestone_progress
WITH (security_invoker = true) AS
SELECT
    b.id AS booking_id,
    mp.full_name AS musician_name,
    hp.full_name AS hirer_name,
    b.event_type,
    b.total_amount,
    COUNT(m.id) > 0 AS has_milestones,
    COUNT(m.id) AS milestones_count,
    COUNT(CASE WHEN m.status = 'paid'     THEN 1 END) AS milestones_paid_count,
    COUNT(CASE WHEN m.status = 'released' THEN 1 END) AS milestones_released_count,
    COALESCE(
        (COUNT(CASE WHEN m.status = 'paid'     THEN 1 END)::DECIMAL / NULLIF(COUNT(m.id), 0)) * 100, 0
    ) AS payment_progress_percentage,
    COALESCE(
        (COUNT(CASE WHEN m.status = 'released' THEN 1 END)::DECIMAL / NULLIF(COUNT(m.id), 0)) * 100, 0
    ) AS release_progress_percentage,
    json_agg(m.* ORDER BY m.milestone_number) AS milestones
FROM bookings b
LEFT JOIN payment_milestones m  ON m.booking_id  = b.id
LEFT JOIN profiles mp           ON mp.user_id    = b.musician_id
LEFT JOIN profiles hp           ON hp.user_id    = b.hirer_id
WHERE EXISTS (SELECT 1 FROM payment_milestones pm WHERE pm.booking_id = b.id)
GROUP BY b.id, mp.full_name, hp.full_name, b.event_type, b.total_amount;

-- ── conversation_list ────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.conversation_list CASCADE;

CREATE OR REPLACE VIEW public.conversation_list
WITH (security_invoker = true) AS
SELECT
    c.id,
    c.participant1_id  AS participant_1_id,
    c.participant2_id  AS participant_2_id,
    c.last_message_at,
    c.created_at,
    -- Participant profiles
    p1.full_name       AS participant_1_name,
    p1.avatar_url      AS participant_1_avatar,
    p2.full_name       AS participant_2_name,
    p2.avatar_url      AS participant_2_avatar,
    -- Last message preview
    (
        SELECT m.content
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message_preview
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id;

GRANT SELECT ON public.conversation_list TO authenticated;

SELECT 'Security definer views fixed' AS status;
