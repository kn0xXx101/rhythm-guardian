-- Add missing booking_status enum values used by app logic and triggers.
-- Fixes runtime error:
--   invalid input value for enum booking_status: "confirmed"

DO $$
BEGIN
  -- Add 'confirmed' if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status'
      AND e.enumlabel = 'confirmed'
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'confirmed';
  END IF;

  -- Add 'in_progress' if missing (used by dashboard and scheduling logic)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status'
      AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'in_progress';
  END IF;
END $$;

