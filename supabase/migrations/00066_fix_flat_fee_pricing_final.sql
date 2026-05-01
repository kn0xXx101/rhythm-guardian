-- Final fix for flat fee pricing
-- Ensures all musicians have correct pricing model set

-- Set pricing models for musicians who don't have one
UPDATE profiles 
SET pricing_model = CASE 
    WHEN base_price IS NOT NULL AND base_price > 0 THEN 'fixed'
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'hourly'
END
WHERE role = 'musician' 
  AND (pricing_model IS NULL OR pricing_model = '');

-- Clean up musicians with both prices set (shouldn't happen but fix if it does)
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

-- Update profile completion for musicians with valid pricing
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
      (pricing_model = 'hourly' AND hourly_rate IS NOT NULL AND hourly_rate > 0)
  )
  AND profile_complete IS NOT TRUE;