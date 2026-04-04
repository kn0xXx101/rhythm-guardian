-- Add pricing type differentiation to bookings
-- This allows bookings to be either hourly-based or fixed-price

-- Add pricing_type enum
DO $$ BEGIN
    CREATE TYPE pricing_type AS ENUM ('hourly', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add pricing fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pricing_type pricing_type DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hours_booked DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2);

-- Add comment to explain the fields
COMMENT ON COLUMN bookings.pricing_type IS 'Type of pricing: hourly (rate × hours) or fixed (flat fee)';
COMMENT ON COLUMN bookings.hourly_rate IS 'Hourly rate for hourly bookings (from musician profile)';
COMMENT ON COLUMN bookings.hours_booked IS 'Number of hours booked for hourly bookings';
COMMENT ON COLUMN bookings.base_amount IS 'Base amount before any fees or adjustments';

-- Update existing bookings to have pricing_type = 'fixed' and base_amount = total_amount
UPDATE bookings 
SET 
    pricing_type = 'fixed',
    base_amount = total_amount
WHERE pricing_type IS NULL OR base_amount IS NULL;

-- Create function to calculate booking amount based on pricing type
CREATE OR REPLACE FUNCTION calculate_booking_amount(
    p_pricing_type pricing_type,
    p_hourly_rate DECIMAL,
    p_hours_booked DECIMAL,
    p_fixed_amount DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF p_pricing_type = 'hourly' THEN
        RETURN p_hourly_rate * p_hours_booked;
    ELSE
        RETURN p_fixed_amount;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-calculate total_amount when booking is created/updated
CREATE OR REPLACE FUNCTION update_booking_total_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate base amount based on pricing type
    IF NEW.pricing_type = 'hourly' THEN
        NEW.base_amount := NEW.hourly_rate * NEW.hours_booked;
    ELSIF NEW.base_amount IS NULL THEN
        NEW.base_amount := NEW.total_amount;
    END IF;
    
    -- If total_amount is not explicitly set, use base_amount
    IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
        NEW.total_amount := NEW.base_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_booking_total_amount ON bookings;
CREATE TRIGGER trigger_update_booking_total_amount
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_total_amount();

-- Add index for pricing_type queries
CREATE INDEX IF NOT EXISTS idx_bookings_pricing_type ON bookings(pricing_type);

-- Add validation constraint
ALTER TABLE bookings 
ADD CONSTRAINT check_hourly_booking_fields 
CHECK (
    (pricing_type = 'hourly' AND hourly_rate IS NOT NULL AND hours_booked IS NOT NULL) 
    OR 
    (pricing_type = 'fixed' AND base_amount IS NOT NULL)
    OR
    pricing_type IS NULL
);
