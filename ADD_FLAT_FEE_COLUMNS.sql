-- Add flat fee pricing columns to profiles table
-- Run this to enable flat fee pricing functionality

-- Step 1: Try to add pricing_model column (will error if exists, that's OK)
ALTER TABLE profiles ADD COLUMN pricing_model TEXT DEFAULT 'hourly';
ALTER TABLE profiles ADD CONSTRAINT pricing_model_check CHECK (pricing_model IN ('hourly', 'fixed'));

-- Step 2: Try to add base_price column (will error if exists, that's OK)
ALTER TABLE profiles ADD COLUMN base_price DECIMAL(10,2);

-- Step 3: Set pricing models for existing musicians based on what they have
UPDATE profiles 
SET pricing_model = CASE 
    WHEN base_price IS NOT NULL AND base_price > 0 THEN 'fixed'
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'hourly'
END
WHERE role = 'musician' 
  AND (pricing_model IS NULL OR pricing_model = '');

-- Step 4: Show results
SELECT 
    'Results' as info,
    pricing_model,
    COUNT(*) as musician_count
FROM profiles 
WHERE role = 'musician'
GROUP BY pricing_model
ORDER BY pricing_model;