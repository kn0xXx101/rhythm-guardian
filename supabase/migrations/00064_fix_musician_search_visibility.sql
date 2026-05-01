-- Comprehensive fix for musician search visibility issues
-- Ensures verified musicians appear in hirer search results

-- 1. First, let's check and fix the auto-activation trigger
DROP TRIGGER IF EXISTS trigger_auto_activate_on_verification ON profiles;
DROP FUNCTION IF EXISTS auto_activate_on_verification();

-- Create improved auto-activation function
CREATE OR REPLACE FUNCTION auto_activate_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When admin verifies documents, automatically activate the profile
    IF TG_OP = 'UPDATE' 
       AND OLD.documents_verified = FALSE 
       AND NEW.documents_verified = TRUE 
       AND NEW.role = 'musician' THEN
        
        -- Set profile to active so it appears in search
        NEW.is_active := TRUE;
        NEW.status := 'active';
        
        -- Notify the musician that their profile is now verified and active
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.user_id,
            'system',
            '🎉 Profile Verified & Active',
            'Congratulations! Your identity has been verified and your profile is now active. You will now appear in hirer search results and can receive bookings.',
            '/musician/profile',
            jsonb_build_object(
                'verified', true,
                'activated', true,
                'search_visible', true,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER trigger_auto_activate_on_verification
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_on_verification();

-- 2. Fix all verified musicians who should be active but aren't
UPDATE profiles
SET 
    is_active = TRUE,
    status = 'active',
    updated_at = NOW()
WHERE 
    role = 'musician'
    AND documents_verified = TRUE
    AND (is_active != TRUE OR status != 'active');

-- 3. Create function to check if musician meets search requirements
CREATE OR REPLACE FUNCTION check_musician_search_eligibility(musician_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    missing_requirements TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_row profiles%ROWTYPE;
    missing TEXT[] := '{}';
    instruments_count INTEGER;
    has_pricing BOOLEAN;
BEGIN
    -- Get the profile
    SELECT * INTO profile_row FROM profiles WHERE user_id = musician_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['Profile not found'];
        RETURN;
    END IF;
    
    -- Check basic requirements
    IF profile_row.role != 'musician' THEN
        missing := array_append(missing, 'Not a musician');
    END IF;
    
    IF profile_row.status != 'active' THEN
        missing := array_append(missing, 'Status not active');
    END IF;
    
    IF profile_row.is_active != TRUE THEN
        missing := array_append(missing, 'Profile not activated');
    END IF;
    
    -- Check profile completeness
    IF profile_row.full_name IS NULL OR LENGTH(TRIM(profile_row.full_name)) < 2 THEN
        missing := array_append(missing, 'Full name missing or too short');
    END IF;
    
    IF profile_row.location IS NULL OR LENGTH(TRIM(profile_row.location)) < 2 THEN
        missing := array_append(missing, 'Location missing or too short');
    END IF;
    
    -- Check instruments
    SELECT COALESCE(array_length(profile_row.instruments, 1), 0) INTO instruments_count;
    IF instruments_count = 0 THEN
        missing := array_append(missing, 'No instruments specified');
    END IF;
    
    -- Check pricing (either hourly_rate OR base_price based on pricing_model)
    SELECT (
        CASE 
            WHEN profile_row.pricing_model = 'fixed' THEN
                (profile_row.base_price IS NOT NULL AND profile_row.base_price > 0)
            ELSE 
                (profile_row.hourly_rate IS NOT NULL AND profile_row.hourly_rate > 0)
        END
    ) INTO has_pricing;
    
    IF NOT has_pricing THEN
        missing := array_append(missing, 'No pricing set (hourly_rate or base_price)');
    END IF;
    
    -- Return result
    RETURN QUERY SELECT (array_length(missing, 1) IS NULL OR array_length(missing, 1) = 0), missing;
END;
$$;

-- 4. Create view for search-eligible musicians
CREATE OR REPLACE VIEW musician_search_results AS
SELECT 
    p.*,
    CASE 
        WHEN p.role = 'musician' 
         AND p.status = 'active' 
         AND p.is_active = TRUE
         AND p.full_name IS NOT NULL 
         AND LENGTH(TRIM(p.full_name)) >= 2
         AND p.location IS NOT NULL 
         AND LENGTH(TRIM(p.location)) >= 2
         AND COALESCE(array_length(p.instruments, 1), 0) > 0
         AND ((p.hourly_rate IS NOT NULL AND p.hourly_rate > 0) OR (p.base_price IS NOT NULL AND p.base_price > 0))
        THEN TRUE 
        ELSE FALSE 
    END as search_eligible
FROM profiles p
WHERE p.role = 'musician';

-- 5. Update profile completion for all musicians
UPDATE profiles 
SET profile_complete = TRUE
WHERE role = 'musician'
  AND status = 'active'
  AND is_active = TRUE
  AND full_name IS NOT NULL 
  AND LENGTH(TRIM(full_name)) >= 2
  AND location IS NOT NULL 
  AND LENGTH(TRIM(location)) >= 2
  AND COALESCE(array_length(instruments, 1), 0) > 0
  AND ((hourly_rate IS NOT NULL AND hourly_rate > 0) OR (base_price IS NOT NULL AND base_price > 0))
  AND profile_complete IS NOT TRUE;

-- 6. Log results
DO $$
DECLARE
    activated_count INTEGER;
    eligible_count INTEGER;
BEGIN
    -- Count activated musicians
    SELECT COUNT(*) INTO activated_count
    FROM profiles 
    WHERE role = 'musician' 
      AND documents_verified = TRUE 
      AND is_active = TRUE 
      AND status = 'active';
    
    -- Count search-eligible musicians
    SELECT COUNT(*) INTO eligible_count
    FROM musician_search_results 
    WHERE search_eligible = TRUE;
    
    RAISE NOTICE 'Musician search visibility fix completed:';
    RAISE NOTICE '- Activated musicians: %', activated_count;
    RAISE NOTICE '- Search-eligible musicians: %', eligible_count;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION auto_activate_on_verification IS 'Automatically activates musician profile when admin verifies documents, ensuring they appear in search';
COMMENT ON FUNCTION check_musician_search_eligibility IS 'Checks if a musician meets all requirements to appear in hirer search results';
COMMENT ON VIEW musician_search_results IS 'View of musicians with search eligibility status for debugging';