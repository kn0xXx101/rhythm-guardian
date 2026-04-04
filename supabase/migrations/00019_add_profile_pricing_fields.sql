-- Add pricing model fields to profiles table
-- This allows musicians to set either hourly rates or flat fees

-- Add pricing fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'hourly' CHECK (pricing_model IN ('hourly', 'fixed')),
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);

-- Add comments to explain the fields
COMMENT ON COLUMN profiles.pricing_model IS 'Pricing model: hourly (rate per hour) or fixed (flat fee)';
COMMENT ON COLUMN profiles.base_price IS 'Base flat fee price for fixed pricing model';
COMMENT ON COLUMN profiles.hourly_rate IS 'Hourly rate for hourly pricing model';

-- Add index for pricing_model queries
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_model ON profiles(pricing_model);

-- Update existing profiles: if they have hourly_rate set, use hourly model, otherwise fixed
UPDATE profiles 
SET pricing_model = CASE 
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'fixed'
END
WHERE pricing_model IS NULL;
