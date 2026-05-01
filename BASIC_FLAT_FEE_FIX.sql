-- Basic flat fee pricing fix - run each statement separately if needed

-- Check current columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('pricing_model', 'base_price', 'hourly_rate');

-- Set pricing models for existing musicians (if pricing_model column exists)
UPDATE profiles 
SET pricing_model = 'fixed'
WHERE role = 'musician' 
  AND base_price IS NOT NULL 
  AND base_price > 0
  AND (pricing_model IS NULL OR pricing_model != 'fixed');

UPDATE profiles 
SET pricing_model = 'hourly'
WHERE role = 'musician' 
  AND hourly_rate IS NOT NULL 
  AND hourly_rate > 0
  AND (pricing_model IS NULL OR pricing_model != 'hourly')
  AND (base_price IS NULL OR base_price <= 0);

-- Update profile completion for flat fee musicians
UPDATE profiles 
SET profile_complete = TRUE
WHERE role = 'musician'
  AND status = 'active'
  AND is_active = TRUE
  AND full_name IS NOT NULL 
  AND location IS NOT NULL 
  AND COALESCE(array_length(instruments, 1), 0) > 0
  AND base_price IS NOT NULL 
  AND base_price > 0
  AND profile_complete IS NOT TRUE;

-- Show current state
SELECT 
    full_name,
    pricing_model,
    hourly_rate,
    base_price,
    profile_complete,
    status,
    is_active
FROM profiles 
WHERE role = 'musician' 
  AND (base_price > 0 OR hourly_rate > 0)
ORDER BY created_at DESC 
LIMIT 10;