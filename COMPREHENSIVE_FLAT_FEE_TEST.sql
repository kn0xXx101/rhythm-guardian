-- Comprehensive test for flat fee pricing system
-- This will test the entire flow from profile creation to search visibility

-- Step 1: Check current state of pricing system
\echo '=== STEP 1: Current Pricing System State ==='

SELECT 
    'Pricing columns exist' as check_name,
    COUNT(*) as result
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('pricing_model', 'base_price');

SELECT 
    'Current pricing models' as info,
    pricing_model,
    COUNT(*) as musician_count
FROM profiles 
WHERE role = 'musician'
GROUP BY pricing_model
ORDER BY pricing_model;

-- Step 2: Create test musicians with different pricing models
\echo '=== STEP 2: Creating Test Musicians ==='

-- Clean up any existing test musicians
DELETE FROM profiles WHERE email LIKE 'test.pricing.%@example.com';

-- Create hourly rate musician
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
    hourly_rate,
    base_price,
    status,
    is_active
) VALUES (
    gen_random_uuid(),
    'musician',
    'Hourly Rate Musician',
    'test.pricing.hourly@example.com',
    '+233501111111',
    'Accra, Ghana',
    'Professional musician with hourly pricing',
    ARRAY['Guitar', 'Bass'],
    ARRAY['Rock', 'Blues'],
    'hourly',
    150.00,
    NULL,
    'active',
    TRUE
);

-- Create flat fee musician
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
    'Flat Fee Musician',
    'test.pricing.flatfee@example.com',
    '+233502222222',
    'Kumasi, Ghana',
    'Professional musician with flat fee pricing',
    ARRAY['Piano', 'Vocals'],
    ARRAY['Jazz', 'Soul'],
    'fixed',
    800.00,
    NULL,
    'active',
    TRUE
);

-- Create musician with no pricing model but has base_price (legacy)
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
    'Legacy Flat Fee Musician',
    'test.pricing.legacy@example.com',
    '+233503333333',
    'Tamale, Ghana',
    'Musician with legacy flat fee setup',
    ARRAY['Drums', 'Percussion'],
    ARRAY['Afrobeats', 'Traditional'],
    NULL,
    600.00,
    NULL,
    'active',
    TRUE
);

-- Step 3: Test profile completion calculation
\echo '=== STEP 3: Testing Profile Completion ==='

SELECT 
    full_name,
    pricing_model,
    hourly_rate,
    base_price,
    -- Manual profile completion calculation
    CASE 
        WHEN full_name IS NOT NULL 
         AND email IS NOT NULL 
         AND phone IS NOT NULL 
         AND location IS NOT NULL 
         AND bio IS NOT NULL
         AND COALESCE(array_length(instruments, 1), 0) > 0
         AND COALESCE(array_length(genres, 1), 0) > 0
         AND (
             (pricing_model = 'fixed' AND base_price > 0) OR
             (pricing_model = 'hourly' AND hourly_rate > 0) OR
             (pricing_model IS NULL AND (base_price > 0 OR hourly_rate > 0))
         )
        THEN 'Should be complete'
        ELSE 'Incomplete'
    END as manual_completion_check,
    profile_complete,
    profile_completion_percentage
FROM profiles 
WHERE email LIKE 'test.pricing.%@example.com'
ORDER BY email;

-- Step 4: Test search eligibility (if function exists)
\echo '=== STEP 4: Testing Search Eligibility ==='

DO $
DECLARE
    test_musician RECORD;
    eligibility_result RECORD;
BEGIN
    -- Test each pricing model
    FOR test_musician IN 
        SELECT user_id, full_name, pricing_model, hourly_rate, base_price
        FROM profiles 
        WHERE email LIKE 'test.pricing.%@example.com'
    LOOP
        RAISE NOTICE 'Testing musician: % (Model: %, Hourly: %, Base: %)', 
            test_musician.full_name, 
            test_musician.pricing_model, 
            test_musician.hourly_rate, 
            test_musician.base_price;
            
        -- Check if function exists before calling
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_musician_search_eligibility') THEN
            SELECT * INTO eligibility_result 
            FROM check_musician_search_eligibility(test_musician.user_id);
            
            RAISE NOTICE '  -> Eligible: %, Missing: %', 
                eligibility_result.eligible, 
                eligibility_result.missing_requirements;
        ELSE
            RAISE NOTICE '  -> Search eligibility function not available';
        END IF;
    END LOOP;
END $;

-- Step 5: Test search view (if exists)
\echo '=== STEP 5: Testing Search View ==='

DO $
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'musician_search_results') THEN
        RAISE NOTICE 'Testing musician_search_results view...';
        
        -- Show search results for test musicians
        PERFORM * FROM (
            SELECT 
                full_name,
                pricing_model,
                hourly_rate,
                base_price,
                search_eligible,
                pricing_display
            FROM musician_search_results 
            WHERE full_name LIKE '%Musician'
            ORDER BY full_name
        ) t;
    ELSE
        RAISE NOTICE 'musician_search_results view does not exist';
    END IF;
END $;

-- Step 6: Manual search eligibility check
\echo '=== STEP 6: Manual Search Eligibility Check ==='

SELECT 
    full_name,
    pricing_model,
    hourly_rate,
    base_price,
    status,
    is_active,
    -- Manual eligibility check
    CASE 
        WHEN role = 'musician' 
         AND status = 'active' 
         AND is_active = TRUE
         AND full_name IS NOT NULL 
         AND LENGTH(TRIM(full_name)) >= 2
         AND location IS NOT NULL 
         AND LENGTH(TRIM(location)) >= 2
         AND COALESCE(array_length(instruments, 1), 0) > 0
         AND (
             (pricing_model = 'fixed' AND base_price > 0) OR
             (pricing_model = 'hourly' AND hourly_rate > 0) OR
             (pricing_model IS NULL AND (base_price > 0 OR hourly_rate > 0))
         )
        THEN 'ELIGIBLE'
        ELSE 'NOT ELIGIBLE'
    END as manual_eligibility,
    -- Show what's missing
    CASE 
        WHEN role != 'musician' THEN 'Not a musician'
        WHEN status != 'active' THEN 'Status not active'
        WHEN is_active != TRUE THEN 'Profile not activated'
        WHEN full_name IS NULL OR LENGTH(TRIM(full_name)) < 2 THEN 'Name missing/short'
        WHEN location IS NULL OR LENGTH(TRIM(location)) < 2 THEN 'Location missing/short'
        WHEN COALESCE(array_length(instruments, 1), 0) = 0 THEN 'No instruments'
        WHEN NOT (
             (pricing_model = 'fixed' AND base_price > 0) OR
             (pricing_model = 'hourly' AND hourly_rate > 0) OR
             (pricing_model IS NULL AND (base_price > 0 OR hourly_rate > 0))
         ) THEN 'No valid pricing'
        ELSE 'All requirements met'
    END as missing_requirement
FROM profiles 
WHERE email LIKE 'test.pricing.%@example.com'
ORDER BY email;

-- Step 7: Summary
\echo '=== STEP 7: Summary ==='

SELECT 
    'Total test musicians created' as metric,
    COUNT(*) as value
FROM profiles 
WHERE email LIKE 'test.pricing.%@example.com';

SELECT 
    'Musicians by pricing model' as metric,
    pricing_model,
    COUNT(*) as count
FROM profiles 
WHERE email LIKE 'test.pricing.%@example.com'
GROUP BY pricing_model;

-- Clean up test data
-- DELETE FROM profiles WHERE email LIKE 'test.pricing.%@example.com';