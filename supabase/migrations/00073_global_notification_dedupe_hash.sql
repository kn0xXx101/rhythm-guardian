-- 00073_global_notification_dedupe_hash.sql
-- Enforce "no duplicate notifications" across ALL patterns/sources.
--
-- Definition of duplicate:
-- Same (user_id, type, title, content, action_url, metadata) after normalization.
--
-- Implementation:
-- - Add a deterministic hash column and a unique index on it
-- - Backfill + remove existing duplicates (keep newest)
-- - Add a BEFORE INSERT trigger that:
--   - Computes the hash
--   - If a row with the same hash already exists, updates it and skips inserting a new row
--   - Otherwise inserts normally
--
-- This prevents duplicates even if some legacy triggers insert directly into notifications.

-- Needed for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure metadata exists (older schemas may not have it)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add hash column
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_hash TEXT;

-- Backfill hash for existing rows
UPDATE public.notifications
SET dedupe_hash = encode(
  digest(
    concat_ws(
      '||',
      user_id::text,
      type::text,
      COALESCE(title, ''),
      COALESCE(content, ''),
      COALESCE(action_url, ''),
      COALESCE(metadata, '{}'::jsonb)::text
    ),
    'sha256'
  ),
  'hex'
)
WHERE dedupe_hash IS NULL;

-- Delete exact duplicates by hash (keep newest)
WITH ranked AS (
  SELECT
    ctid,
    dedupe_hash,
    row_number() OVER (PARTITION BY dedupe_hash ORDER BY created_at DESC, id DESC) AS rn
  FROM public.notifications
  WHERE dedupe_hash IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.ctid = r.ctid
  AND r.rn > 1;

-- Unique index to enforce no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_dedupe_hash
  ON public.notifications (dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

-- Trigger function to prevent duplicates on insert (without raising errors)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_hash TEXT;
  v_existing_id UUID;
BEGIN
  v_hash := encode(
    digest(
      concat_ws(
        '||',
        NEW.user_id::text,
        NEW.type::text,
        COALESCE(NEW.title, ''),
        COALESCE(NEW.content, ''),
        COALESCE(NEW.action_url, ''),
        COALESCE(NEW.metadata, '{}'::jsonb)::text
      ),
      'sha256'
    ),
    'hex'
  );

  NEW.dedupe_hash := v_hash;

  SELECT id INTO v_existing_id
  FROM public.notifications
  WHERE dedupe_hash = v_hash
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.notifications
    SET
      content = NEW.content,
      action_url = NEW.action_url,
      metadata = COALESCE(NEW.metadata, '{}'::jsonb),
      updated_at = NOW()
    WHERE id = v_existing_id;

    -- Skip insert; we updated the existing row
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_notifications ON public.notifications;
CREATE TRIGGER trg_prevent_duplicate_notifications
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_notifications();

