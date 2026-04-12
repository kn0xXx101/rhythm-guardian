-- Ensure notification primitives exist (enum, table column, function signature).
-- Fixes runtime error:
--   function create_notification(uuid, notification_type, text, text, text, jsonb) does not exist

-- 1) Ensure enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('system', 'booking', 'payment', 'message', 'review', 'payout');
  END IF;
END $$;

-- 2) Ensure notifications table exists (minimal columns)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Ensure metadata column exists (some earlier migrations create a "simple" table without it)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4) Ensure create_notification exists with the exact signature triggers expect
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
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
  VALUES (p_user_id, p_type, p_title, p_content, p_action_url, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, notification_type, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- 5) Re-apply safe booking trigger function (in case triggers are still pointing to an older implementation)
-- This intentionally never blocks booking writes.
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  hirer_name TEXT;
  notification_title TEXT;
  notification_content TEXT;
  recipient_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(full_name, 'A client') INTO hirer_name
    FROM public.profiles WHERE user_id = NEW.hirer_id;

    INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
    VALUES (
      NEW.musician_id,
      'booking',
      'New Booking Request',
      hirer_name || ' sent you a booking request for ' || COALESCE(NEW.event_type, 'an event'),
      '/musician/bookings',
      jsonb_build_object('booking_id', NEW.id)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'accepted' THEN
          notification_title   := 'Booking Accepted';
          notification_content := 'Your booking request has been accepted';
          recipient_id         := NEW.hirer_id;
        WHEN 'rejected' THEN
          notification_title   := 'Booking Declined';
          notification_content := 'Your booking request was declined';
          recipient_id         := NEW.hirer_id;
        WHEN 'completed' THEN
          notification_title   := 'Booking Completed';
          notification_content := 'Your booking has been marked as completed';
          recipient_id         := NEW.hirer_id;
        WHEN 'cancelled' THEN
          notification_title   := 'Booking Cancelled';
          notification_content := 'A booking has been cancelled';
          recipient_id         := CASE
            WHEN NEW.cancellation_requested_by = NEW.hirer_id THEN NEW.musician_id
            ELSE NEW.hirer_id
          END;
        ELSE
          recipient_id := NULL;
      END CASE;

      IF recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
          recipient_id,
          'booking',
          notification_title,
          notification_content,
          '/bookings',
          jsonb_build_object('booking_id', NEW.id)
        );
      END IF;
    END IF;

    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
      INSERT INTO public.notifications (user_id, type, title, content, action_url, metadata)
      VALUES (
        NEW.musician_id,
        'payment',
        'Payment Received',
        'Payment received for ' || COALESCE(NEW.event_type, 'your booking'),
        '/musician/bookings',
        jsonb_build_object('booking_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'create_booking_notification error (ignored): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_booking_change ON public.bookings;
CREATE TRIGGER on_booking_change
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_booking_notification();

