-- Fix flat fee pricing system to work properly as an alternative to hourly pricing
-- Users should be able to choose EITHER flat fee OR hourly rate, not both

-- 1. Update the search eligibility view to properly handle both pricing models
DROP VIEW IF EXISTS musician_search_results;
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
         AND (
             -- Check pricing based on pricing_model
             CASE 
                 WHEN p.pricing_model = 'fixed' THEN 
                     (p.base_price IS NOT NULL AND p.base_price > 0)
                 ELSE 
                     (p.hourly_rate IS NOT NULL AND p.hourly_rate > 0)
             END
         )
        THEN TRUE 
        ELSE FALSE 
    END as search_eligible,
    -- Add pricing info for debugging
    CASE 
        WHEN p.pricing_model = 'fixed' AND p.base_price > 0 THEN 
            'Fixed: ₵' || p.base_price
        WHEN p.hourly_rate > 0 THEN 
            'Hourly: ₵' || p.hourly_rate || '/hr'
        ELSE 
            'No pricing set'
    END as pricing_display
FROM profiles p
WHERE p.role = 'musician';

-- 2. Update the search eligibility function to handle pricing models correctly
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
    
    -- Check pricing based on pricing model
    SELECT (
        CASE 
            WHEN profile_row.pricing_model = 'fixed' THEN
                (profile_row.base_price IS NOT NULL AND profile_row.base_price > 0)
            ELSE 
                (profile_row.hourly_rate IS NOT NULL AND profile_row.hourly_rate > 0)
        END
    ) INTO has_pricing;
    
    IF NOT has_pricing THEN
        IF profile_row.pricing_model = 'fixed' THEN
            missing := array_append(missing, 'Flat fee amount not set');
        ELSE
            missing := array_append(missing, 'Hourly rate not set');
        END IF;
    END IF;
    
    -- Return result
    RETURN QUERY SELECT (array_length(missing, 1) IS NULL OR array_length(missing, 1) = 0), missing;
END;
$$;

-- 3. Create function to validate pricing model consistency
CREATE OR REPLACE FUNCTION validate_musician_pricing()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    pricing_model TEXT,
    hourly_rate NUMERIC,
    base_price NUMERIC,
    issue TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.full_name,
        p.pricing_model,
        p.hourly_rate,
        p.base_price,
        CASE 
            WHEN p.pricing_model = 'fixed' AND (p.base_price IS NULL OR p.base_price <= 0) THEN
                'Fixed pricing selected but no base_price set'
            WHEN p.pricing_model = 'hourly' AND (p.hourly_rate IS NULL OR p.hourly_rate <= 0) THEN
                'Hourly pricing selected but no hourly_rate set'
            WHEN p.pricing_model IS NULL AND (p.hourly_rate IS NULL OR p.hourly_rate <= 0) AND (p.base_price IS NULL OR p.base_price <= 0) THEN
                'No pricing model or rates set'
            WHEN p.pricing_model = 'fixed' AND p.hourly_rate IS NOT NULL AND p.hourly_rate > 0 THEN
                'Fixed pricing but hourly_rate also set (should be null)'
            WHEN p.pricing_model = 'hourly' AND p.base_price IS NOT NULL AND p.base_price > 0 THEN
                'Hourly pricing but base_price also set (should be null)'
            ELSE
                'Pricing configuration looks correct'
        END as issue
    FROM profiles p
    WHERE p.role = 'musician'
    ORDER BY p.created_at DESC;
END;
$$;

-- 4. Fix any musicians with inconsistent pricing
-- Clear opposite pricing field when pricing_model is set
UPDATE profiles 
SET hourly_rate = NULL
WHERE role = 'musician' 
  AND pricing_model = 'fixed' 
  AND hourly_rate IS NOT NULL;

UPDATE profiles 
SET base_price = NULL
WHERE role = 'musician' 
  AND pricing_model = 'hourly' 
  AND base_price IS NOT NULL;

-- Set default pricing_model for musicians who have pricing but no model
UPDATE profiles 
SET pricing_model = CASE 
    WHEN base_price IS NOT NULL AND base_price > 0 THEN 'fixed'
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'hourly'
END
WHERE role = 'musician' 
  AND pricing_model IS NULL;

-- 5. Update profile completion for musicians with flat fee pricing
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
  AND (
      (pricing_model = 'fixed' AND base_price IS NOT NULL AND base_price > 0) OR
      (pricing_model != 'fixed' AND hourly_rate IS NOT NULL AND hourly_rate > 0)
  )
  AND profile_complete IS NOT TRUE;

-- 6. Log results
DO $$
DECLARE
    fixed_pricing_count INTEGER;
    hourly_pricing_count INTEGER;
    eligible_count INTEGER;
BEGIN
    -- Count pricing models
    SELECT COUNT(*) INTO fixed_pricing_count
    FROM profiles 
    WHERE role = 'musician' AND pricing_model = 'fixed' AND base_price > 0;
    
    SELECT COUNT(*) INTO hourly_pricing_count
    FROM profiles 
    WHERE role = 'musician' AND pricing_model = 'hourly' AND hourly_rate > 0;
    
    -- Count search-eligible musicians
    SELECT COUNT(*) INTO eligible_count
    FROM musician_search_results 
    WHERE search_eligible = TRUE;
    
    RAISE NOTICE 'Flat fee pricing fix completed:';
    RAISE NOTICE '- Musicians with fixed pricing: %', fixed_pricing_count;
    RAISE NOTICE '- Musicians with hourly pricing: %', hourly_pricing_count;
    RAISE NOTICE '- Total search-eligible musicians: %', eligible_count;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION validate_musician_pricing IS 'Validates pricing model consistency for musicians - helps debug flat fee vs hourly rate issues';
COMMENT ON VIEW musician_search_results IS 'Updated view that properly handles both flat fee and hourly pricing models';