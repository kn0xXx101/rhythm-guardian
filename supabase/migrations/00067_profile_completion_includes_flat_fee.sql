-- Profile completion only awarded the "pricing" point for hourly_rate.
-- Musicians on flat fee have base_price set and hourly_rate NULL, so they lost that point
-- and often fell below 80% — profile_complete stayed false and hirer search excluded them
-- (see isMusicianSearchEligible in InstrumentalistSearch).

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 10;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE user_id = p_user_id;

    IF profile_record IS NULL THEN
        RETURN 0;
    END IF;

    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completion_score := completion_score + 1;
    END IF;

    IF profile_record.role = 'musician' THEN
        IF profile_record.instruments IS NOT NULL AND array_length(profile_record.instruments, 1) > 0 THEN
            completion_score := completion_score + 1;
        END IF;

        IF profile_record.genres IS NOT NULL AND array_length(profile_record.genres, 1) > 0 THEN
            completion_score := completion_score + 1;
        END IF;

        IF (profile_record.hourly_rate IS NOT NULL AND profile_record.hourly_rate > 0)
           OR (profile_record.base_price IS NOT NULL AND profile_record.base_price > 0) THEN
            completion_score := completion_score + 1;
        END IF;

        IF (profile_record.bank_account_number IS NOT NULL AND profile_record.bank_code IS NOT NULL)
           OR (profile_record.mobile_money_number IS NOT NULL AND profile_record.mobile_money_provider IS NOT NULL) THEN
            completion_score := completion_score + 1;
        END IF;
    ELSE
        completion_score := completion_score + 4;
    END IF;

    RETURN (completion_score * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

UPDATE profiles AS p
SET
  profile_completion_percentage = sub.pct,
  profile_complete = sub.pct >= 80
FROM (
  SELECT user_id, public.calculate_profile_completion(user_id) AS pct
  FROM profiles
  WHERE role = 'musician'
) AS sub
WHERE p.user_id = sub.user_id;

DO $$ BEGIN
  ALTER FUNCTION public.calculate_profile_completion(uuid) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
