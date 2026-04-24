-- Schedule periodic run of auto_close_expired_tickets() when pg_cron is available.
-- Idempotent: removes an existing job with the same name before scheduling.

-- Outer delimiter must not be $$: inside that string, -- is not a comment, so any $$ in a
-- "comment" line would still close the block. Use $do$ ... $do$ instead.
DO $do$
DECLARE
  jid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT j.jobid INTO jid FROM cron.job j WHERE j.jobname = 'support-ticket-auto-close' LIMIT 1;
    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;

    PERFORM cron.schedule(
      'support-ticket-auto-close',
      '*/15 * * * *',
      $croncmd$SELECT public.auto_close_expired_tickets()$croncmd$
    );
    RAISE NOTICE 'Scheduled support-ticket-auto-close (every 15 minutes) via pg_cron';
  ELSE
    RAISE WARNING 'pg_cron extension not installed; support ticket auto-close was not scheduled. Enable pg_cron in the Supabase Dashboard if you want timed closures.';
  END IF;
END $do$;
