-- Completes a referral when a new user verifies their email. Uses SECURITY DEFINER because
-- referrals UPDATE is restricted to admins (see 00048_fix_remaining_warnings.sql).

CREATE OR REPLACE FUNCTION public.complete_referral_signup(
  p_referral_code TEXT,
  p_new_user_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.referrals%ROWTYPE;
  v_points INTEGER := 100;
BEGIN
  IF p_referral_code IS NULL OR length(trim(p_referral_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  IF p_new_user_id IS NULL OR p_new_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_mismatch');
  END IF;

  SELECT * INTO v_row
  FROM public.referrals
  WHERE referral_code = trim(p_referral_code)
    AND referred_user_id IS NULL
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  UPDATE public.referrals
  SET
    referred_user_id = p_new_user_id,
    referred_email = lower(trim(p_email)),
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_row.id;

  INSERT INTO public.loyalty_points (user_id, points, reason, reference_type, reference_id)
  VALUES (v_row.referrer_id, v_points, 'Referral completed', 'referral', v_row.id);

  RETURN jsonb_build_object('ok', true, 'referrer_id', v_row.referrer_id, 'points_awarded', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_referral_signup(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_referral_signup(TEXT, UUID, TEXT) TO authenticated;
