-- Fix "operator does not exist: text <> booking_status"
-- This happens when the bookings.status column is TEXT in some environments
-- while triggers/functions expect the booking_status enum.

DO $$
DECLARE
  status_type TEXT;
BEGIN
  SELECT data_type
  INTO status_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'status';

  -- If the column exists and is not already the enum type, coerce it.
  IF status_type IS NOT NULL AND status_type <> 'USER-DEFINED' THEN
    -- USER-DEFINED in information_schema means enum/domain. TEXT/VARCHAR will be non-user-defined.
    -- Attempt to cast existing values into booking_status.
    -- Drop dependent views (cannot alter column type while views depend on it).
    DROP VIEW IF EXISTS public.bookings_with_profiles;
    DROP VIEW IF EXISTS public.milestone_progress;
    DROP VIEW IF EXISTS public.analytics_summary;

    -- Drop dependent triggers that reference bookings.status (cannot alter while triggers depend on it).
    DROP TRIGGER IF EXISTS trigger_update_musician_booking_count_insert ON public.bookings;
    DROP TRIGGER IF EXISTS trigger_update_musician_booking_count_update ON public.bookings;
    DROP TRIGGER IF EXISTS trigger_notify_booking_expired ON public.bookings;
    -- Some deployments have additional legacy triggers not present in migrations.
    DROP TRIGGER IF EXISTS trigger_booking_accepted_notification ON public.bookings;
    DROP TRIGGER IF EXISTS trigger_auto_refund_on_status_change ON public.bookings;

    -- Drop the existing default first, otherwise Postgres may fail to cast it.
    ALTER TABLE public.bookings
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.bookings
      ALTER COLUMN status TYPE booking_status
      USING status::booking_status;

    -- Restore a safe default.
    ALTER TABLE public.bookings
      ALTER COLUMN status SET DEFAULT 'pending'::booking_status;

    -- Recreate dependent views using the latest definitions (security_invoker versions).
    CREATE OR REPLACE VIEW public.bookings_with_profiles
    WITH (security_invoker = true) AS
    SELECT 
        b.*,
        h.full_name as hirer_name,
        h.email as hirer_email,
        h.avatar_url as hirer_avatar,
        m.full_name as musician_name,
        m.email as musician_email,
        m.avatar_url as musician_avatar,
        m.rating as musician_rating,
        m.instruments as musician_instruments
    FROM public.bookings b
    LEFT JOIN public.profiles h ON h.user_id = b.hirer_id
    LEFT JOIN public.profiles m ON m.user_id = b.musician_id;

    CREATE OR REPLACE VIEW public.milestone_progress AS
    SELECT 
        b.id as booking_id,
        mp.full_name as musician_name,
        hp.full_name as hirer_name,
        b.event_type,
        b.total_amount,
        COUNT(m2.id) > 0 as has_milestones,
        COUNT(m2.id) as milestones_count,
        COUNT(CASE WHEN m2.status = 'paid' THEN 1 END) as milestones_paid_count,
        COUNT(CASE WHEN m2.status = 'released' THEN 1 END) as milestones_released_count,
        COALESCE((COUNT(CASE WHEN m2.status = 'paid' THEN 1 END)::DECIMAL / NULLIF(COUNT(m2.id), 0)) * 100, 0) as payment_progress_percentage,
        COALESCE((COUNT(CASE WHEN m2.status = 'released' THEN 1 END)::DECIMAL / NULLIF(COUNT(m2.id), 0)) * 100, 0) as release_progress_percentage,
        json_agg(m2.* ORDER BY m2.milestone_number) as milestones
    FROM public.bookings b
    LEFT JOIN public.payment_milestones m2 ON m2.booking_id = b.id
    LEFT JOIN public.profiles mp ON b.musician_id = mp.user_id
    LEFT JOIN public.profiles hp ON b.hirer_id = hp.user_id
    GROUP BY b.id, mp.full_name, hp.full_name, b.event_type, b.total_amount;

    CREATE OR REPLACE VIEW public.analytics_summary
    WITH (security_invoker = true) AS
    SELECT 
        COUNT(DISTINCT CASE WHEN role = 'hirer' THEN user_id END) as total_hirers,
        COUNT(DISTINCT CASE WHEN role = 'musician' THEN user_id END) as total_musicians,
        COUNT(DISTINCT CASE WHEN role = 'musician' AND status = 'active' THEN user_id END) as active_musicians,
        (SELECT COUNT(*) FROM public.bookings) as total_bookings,
        (SELECT COUNT(*) FROM public.bookings WHERE status = 'completed') as completed_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM public.bookings WHERE payment_status = 'paid') as total_revenue,
        (SELECT COALESCE(SUM(platform_fee), 0) FROM public.bookings WHERE payment_status = 'paid') as platform_fees
    FROM public.profiles;

    -- Recreate triggers for musician booking counts (from 00020_fix_bookings_count_and_reviews.sql)
    CREATE TRIGGER trigger_update_musician_booking_count_insert
        AFTER INSERT ON public.bookings
        FOR EACH ROW
        WHEN (NEW.status = 'completed')
        EXECUTE FUNCTION public.update_musician_booking_count();

    CREATE TRIGGER trigger_update_musician_booking_count_update
        AFTER UPDATE OF status ON public.bookings
        FOR EACH ROW
        WHEN (NEW.status = 'completed' OR OLD.status = 'completed')
        EXECUTE FUNCTION public.update_musician_booking_count();

    -- Recreate expiration notification trigger (from 00013_auto_expire_bookings.sql)
    CREATE TRIGGER trigger_notify_booking_expired
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      WHEN (NEW.status = 'expired' AND OLD.status IS DISTINCT FROM 'expired')
      EXECUTE FUNCTION public.notify_booking_expired();

    -- Recreate auto-refund trigger (from 00026_auto_refund_expired_cancelled.sql)
    CREATE TRIGGER trigger_auto_refund_on_status_change
      BEFORE UPDATE ON public.bookings
      FOR EACH ROW
      WHEN (
        NEW.status IN ('expired', 'rejected', 'cancelled') AND
        OLD.status IS DISTINCT FROM NEW.status AND
        NEW.payment_status IN ('paid_to_admin', 'service_completed')
      )
      EXECUTE FUNCTION public.auto_process_refund_on_status_change();
  END IF;
END $$;

