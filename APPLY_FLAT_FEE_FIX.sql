-- Apply flat fee pricing fix directly
-- This ensures flat fee pricing works regardless of migration status

-- 1. Ensure pricing_model and base_price columns exist (if they don't, this will fail gracefully)
DO $
BEGIN
    -- Try to add pricing_model column if it doesn't exist
    BEGIN
        ALTER TABLE profiles ADD COLUMN pricing_model TEXT CHECK (pricing_model IN ('hourly', 'fixed'));
        RAISE NOTICE 'Added pricing_model column';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'pricing_model column already exists';
    END;
    
    -- Try to add base_price column if it doesn't exist
    BEGIN
        ALTER TABLE profiles ADD COLUMN base_price DECIMAL(10,2);
        RAISE NOTICE 'Added base_price column';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'base_price column already exists';
    END;
END $;

-- 2. Set default pricing models for existing musicians
UPDATE profiles 
SET pricing_model = CASE 
    WHEN base_price IS NOT NULL AND base_price > 0 THEN 'fixed'
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'hourly'
END
WHERE role = 'musician' 
  AND pricing_model IS NULL;

-- 3. Clean up inconsistent pricing (musicians should have only one pricing type)
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

-- 4. Create or replace the search eligibility function
CREATE OR REPLACE FUNCTION is_musician_search_eligible(musician_profile profiles)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    -- Check basic requirements
    IF musician_profile.role != 'musician' 
       OR musician_profile.status != 'active' 
       OR musician_profile.is_active != TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Check profile completeness
    IF musician_profile.full_name IS NULL 
       OR LENGTH(TRIM(musician_profile.full_name)) < 2
       OR musician_profile.location IS NULL 
       OR LENGTH(TRIM(musician_profile.location)) < 2
       OR COALESCE(array_length(musician_profile.instruments, 1), 0) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check pricing based on pricing model
    IF musician_profile.pricing_model = 'fixed' THEN
        RETURN (musician_profile.base_price IS NOT NULL AND musician_profile.base_price > 0);
    ELSIF musician_profile.pricing_model = 'hourly' THEN
        RETURN (musician_profile.hourly_rate IS NOT NULL AND musician_profile.hourly_rate > 0);
    ELSE
        -- Fallback: accept either pricing type if no model is set
        RETURN (
            (musician_profile.base_price IS NOT NULL AND musician_profile.base_price > 0) OR
            (musician_profile.hourly_rate IS NOT NULL AND musician_profile.hourly_rate > 0)
        );
    END IF;
END;
$;

-- 5. Update profile completion for musicians with proper pricing
UPDATE profiles 
SET profile_complete = TRUE,
    profile_completion_percentage = 100
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
      (pricing_model = 'hourly' AND hourly_rate IS NOT NULL AND hourly_rate > 0) OR
      (pricing_model IS NULL AND (
          (base_price IS NOT NULL AND base_price > 0) OR 
          (hourly_rate IS NOT NULL AND hourly_rate > 0)
      ))
  )
  AND (profile_complete IS NOT TRUE OR profile_completion_percentage < 100);

-- 6. Test the fix with a sample musician
DO $
DECLARE
    test_user_id UUID;
    test_profile profiles%ROWTYPE;
    is_eligible BOOLEAN;
BEGIN
    -- Create a test flat fee musician
    INSERT INTO profiles (
        user_id,
        role,
        full_name,
        email,
        phone,
        location,
        bio,
        instruments,
        genres,
        pricing_model,
        base_price,
        hourly_rate,
        status,
        is_active
    ) VALUES (
        gen_random_uuid(),
        'musician',
        'Test Flat Fee Fix',
        'test.flatfee.fix@example.com',
        '+233501234567',
        'Accra, Ghana',
        'Testing flat fee pricing fix',
        ARRAY['Guitar'],
        ARRAY['Pop'],
        'fixed',
        500.00,
        NULL,
        'active',
        TRUE
    ) ON CONFLICT (email) DO UPDATE SET
        pricing_model = EXCLUDED.pricing_model,
        base_price = EXCLUDED.base_price,
        hourly_rate = EXCLUDED.hourly_rate,
        updated_at = NOW()
    RETURNING user_id INTO test_user_id;
    
    -- Get the profile and test eligibility
    SELECT * INTO test_profile FROM profiles WHERE user_id = test_user_id;
    SELECT is_musician_search_eligible(test_profile) INTO is_eligible;
    
    RAISE NOTICE 'Flat fee pricing fix test:';
    RAISE NOTICE '- Test musician ID: %', test_user_id;
    RAISE NOTICE '- Pricing model: %', test_profile.pricing_model;
    RAISE NOTICE '- Base price: %', test_profile.base_price;
    RAISE NOTICE '- Search eligible: %', is_eligible;
    RAISE NOTICE '- Profile complete: %', test_profile.profile_complete;
END $;

-- 7. Show summary of pricing models after fix
SELECT 
    'Pricing models after fix' as info,
    pricing_model,
    COUNT(*) as total_musicians,
    COUNT(CASE WHEN profile_complete = TRUE THEN 1 END) as complete_profiles,
    COUNT(CASE WHEN status = 'active' AND is_active = TRUE THEN 1 END) as active_musicians
FROM profiles 
WHERE role = 'musician'
GROUP BY pricing_model
ORDER BY pricing_model;

COMMENT ON FUNCTION is_musician_search_eligible IS 'Checks if a musician profile meets all requirements for search visibility, including proper pricing model validation';