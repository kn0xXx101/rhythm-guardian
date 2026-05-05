-- 00072_dedupe_notifications_and_prevent_duplicates.sql
-- Goal: prevent duplicate notifications (especially from triggers / retries).
--
-- Strategy:
-- 1) Remove existing duplicates for common entity-linked notifications (booking_id, message_id, review_id, ticket_id)
-- 2) Add partial unique indexes to prevent reintroducing duplicates
-- 3) Update create_notification(TEXT) to be idempotent for these common keys

-- 1) Dedupe existing rows (keep most recent per key)
WITH ranked AS (
  SELECT
    ctid,
    id,
    created_at,
    row_number() OVER (
      PARTITION BY
        user_id,
        type,
        title,
        (metadata->>'booking_id'),
        (metadata->>'message_id'),
        (metadata->>'review_id'),
        (metadata->>'ticket_id')
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.notifications
  WHERE metadata ?| ARRAY['booking_id', 'message_id', 'review_id', 'ticket_id']
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.ctid = r.ctid
  AND r.rn > 1;

-- 2) Unique indexes for entity-linked notifications
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_booking
  ON public.notifications (user_id, type, title, ((metadata->>'booking_id')))
  WHERE metadata ? 'booking_id';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_message
  ON public.notifications (user_id, type, title, ((metadata->>'message_id')))
  WHERE metadata ? 'message_id';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_review
  ON public.notifications (user_id, type, title, ((metadata->>'review_id')))
  WHERE metadata ? 'review_id';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_ticket
  ON public.notifications (user_id, type, title, ((metadata->>'ticket_id')))
  WHERE metadata ? 'ticket_id';

-- 3) Make create_notification(UUID, TEXT, ...) idempotent for the above keys
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Booking-linked notifications
  IF COALESCE(p_metadata, '{}'::jsonb) ? 'booking_id' THEN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (p_user_id, p_type::notification_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (user_id, type, title, ((metadata->>'booking_id')))
      WHERE (metadata ? 'booking_id')
    DO UPDATE SET
      -- keep newest content/url/metadata; preserve read state if already read
      content = EXCLUDED.content,
      action_url = EXCLUDED.action_url,
      metadata = EXCLUDED.metadata
    RETURNING id INTO notification_id;

    RETURN notification_id;
  END IF;

  -- Message-linked notifications
  IF COALESCE(p_metadata, '{}'::jsonb) ? 'message_id' THEN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (p_user_id, p_type::notification_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (user_id, type, title, ((metadata->>'message_id')))
      WHERE (metadata ? 'message_id')
    DO UPDATE SET
      content = EXCLUDED.content,
      action_url = EXCLUDED.action_url,
      metadata = EXCLUDED.metadata
    RETURNING id INTO notification_id;

    RETURN notification_id;
  END IF;

  -- Review-linked notifications
  IF COALESCE(p_metadata, '{}'::jsonb) ? 'review_id' THEN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (p_user_id, p_type::notification_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (user_id, type, title, ((metadata->>'review_id')))
      WHERE (metadata ? 'review_id')
    DO UPDATE SET
      content = EXCLUDED.content,
      action_url = EXCLUDED.action_url,
      metadata = EXCLUDED.metadata
    RETURNING id INTO notification_id;

    RETURN notification_id;
  END IF;

  -- Ticket-linked notifications
  IF COALESCE(p_metadata, '{}'::jsonb) ? 'ticket_id' THEN
    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (p_user_id, p_type::notification_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (user_id, type, title, ((metadata->>'ticket_id')))
      WHERE (metadata ? 'ticket_id')
    DO UPDATE SET
      content = EXCLUDED.content,
      action_url = EXCLUDED.action_url,
      metadata = EXCLUDED.metadata
    RETURNING id INTO notification_id;

    RETURN notification_id;
  END IF;

  -- Default: no entity key, just insert
  INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
  VALUES (p_user_id, p_type::notification_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

