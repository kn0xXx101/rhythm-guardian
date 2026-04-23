-- Server-side auto-flagging for high-risk chat content (complements client warnings in src/lib/anti-scam-chat.ts).
-- Preserves user/admin flags: any flag_reason that does NOT start with 'auto:' is left unchanged.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

COMMENT ON COLUMN public.messages.flagged IS 'When true, message appears in admin chat monitor triage.';
COMMENT ON COLUMN public.messages.flag_reason IS 'Human or automated reason; auto:* = server pattern scan.';

CREATE OR REPLACE FUNCTION public.apply_message_content_auto_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c text;
  reasons text := '';
BEGIN
  c := lower(coalesce(NEW.content, ''));

  -- Keep explicit moderation / user reports (do not overwrite).
  IF NEW.flagged IS TRUE
     AND NEW.flag_reason IS NOT NULL
     AND NEW.flag_reason NOT ILIKE 'auto:%' THEN
    RETURN NEW;
  END IF;

  IF length(c) = 0 THEN
    RETURN NEW;
  END IF;

  IF c ~* '(whatsapp|telegram|signal|discord|venmo|zelle|cashapp|cash\s*app|paypal\.me)' THEN
    reasons := reasons || 'auto:external_contact_or_pivot; ';
  END IF;

  IF c ~* '(pay|paid).{0,48}(outside|offline|direct|cash).{0,48}(platform|app|rhythm|site)'
     OR c ~* 'pay\s+me\s+directly'
     OR c ~* 'bypass.{0,24}(platform|app|fee)'
     OR c ~* 'skip.{0,24}(confirmation|confirm|platform)' THEN
    reasons := reasons || 'auto:off_platform_or_collusion_language; ';
  END IF;

  IF c ~* '(bank|routing|iban|swift|bic).{0,12}(number|no\.?|code)?'
     OR c ~* '\bcvv\b|\bcvc\b|\botp\b|\bpassword\b'
     OR c ~* 'mobile\s*money.{0,12}(number|no\.?)?'
     OR c ~* '\b(mtn|vodafone|airteltigo)\b.{0,12}(momo|wallet)?' THEN
    reasons := reasons || 'auto:sensitive_financial_or_auth; ';
  END IF;

  IF length(trim(reasons)) > 0 THEN
    NEW.flagged := TRUE;
    NEW.flag_reason := trim(both ' ' FROM trim(both ';' FROM reasons));
  ELSIF TG_OP = 'UPDATE'
        AND OLD.flag_reason IS NOT NULL
        AND OLD.flag_reason ILIKE 'auto:%' THEN
    -- Content was edited: clear stale auto-flag if it no longer matches.
    NEW.flagged := FALSE;
    NEW.flag_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_message_content_auto_flag() IS
  'Sets messages.flagged from content heuristics; skips rows already flagged with non-auto reasons.';

DROP TRIGGER IF EXISTS trigger_message_auto_flag ON public.messages;

CREATE TRIGGER trigger_message_auto_flag
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_message_content_auto_flag();
