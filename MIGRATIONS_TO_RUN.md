# Database Migrations to Run

Run these SQL scripts in your Supabase SQL Editor in order:

## 1. Add Profile Pricing Fields (00019)

This adds `pricing_model` and `base_price` fields to allow musicians to set either hourly rates or flat fees.

```sql
-- Add pricing model fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'hourly' CHECK (pricing_model IN ('hourly', 'fixed')),
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN profiles.pricing_model IS 'Pricing model: hourly (rate per hour) or fixed (flat fee)';
COMMENT ON COLUMN profiles.base_price IS 'Base flat fee price for fixed pricing model';

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_model ON profiles(pricing_model);

-- Update existing profiles
UPDATE profiles 
SET pricing_model = CASE 
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 THEN 'hourly'
    ELSE 'fixed'
END
WHERE pricing_model IS NULL;
```

## 2. Fix Bookings Count, Messaging, and Reviews (00020)

This fixes:
- Booking counts not showing correctly
- Messaging access after booking is done
- Hirer ability to leave reviews

```sql
-- Fix bookings count, messaging access, and review system

-- ============================================================================
-- 1. Add function to update musician booking count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_musician_booking_count()
RETURNS TRIGGER AS $$
DECLARE
    booking_count INTEGER;
BEGIN
    -- Count completed bookings for the musician
    SELECT COUNT(*) INTO booking_count
    FROM bookings
    WHERE musician_id = COALESCE(NEW.musician_id, OLD.musician_id)
    AND status = 'completed';
    
    -- Update the musician's profile
    UPDATE profiles
    SET total_bookings = booking_count
    WHERE user_id = COALESCE(NEW.musician_id, OLD.musician_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update booking count when booking status changes
DROP TRIGGER IF EXISTS trigger_update_musician_booking_count_insert ON bookings;
DROP TRIGGER IF EXISTS trigger_update_musician_booking_count_update ON bookings;

-- Trigger for INSERT operations
CREATE TRIGGER trigger_update_musician_booking_count_insert
    AFTER INSERT ON bookings
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_musician_booking_count();

-- Trigger for UPDATE operations
CREATE TRIGGER trigger_update_musician_booking_count_update
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    WHEN (NEW.status = 'completed' OR OLD.status = 'completed')
    EXECUTE FUNCTION update_musician_booking_count();

-- ============================================================================
-- 2. Initialize booking counts for existing musicians
-- ============================================================================

UPDATE profiles p
SET total_bookings = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.musician_id = p.user_id
    AND b.status = 'completed'
)
WHERE p.role = 'musician';

-- ============================================================================
-- 3. Fix review system - ensure hirers can leave reviews
-- ============================================================================

-- Update the update_musician_rating function to handle both musician and hirer reviews
CREATE OR REPLACE FUNCTION update_musician_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    -- Calculate average rating and count for the reviewee (musician)
    SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews
    WHERE reviewee_id = NEW.reviewee_id;
    
    -- Update the musician's profile
    UPDATE profiles
    SET rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE user_id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are properly set
DROP TRIGGER IF EXISTS on_review_created ON reviews;
DROP TRIGGER IF EXISTS on_review_updated ON reviews;

CREATE TRIGGER on_review_created
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_musician_rating();

CREATE TRIGGER on_review_updated
    AFTER UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_musician_rating();

-- ============================================================================
-- 4. Create function to check if users can message each other
-- ============================================================================

CREATE OR REPLACE FUNCTION can_users_message(
    hirer_user_id UUID,
    musician_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_paid_booking BOOLEAN;
    hirer_role TEXT;
    musician_role TEXT;
BEGIN
    -- Get user roles
    SELECT role INTO hirer_role FROM profiles WHERE user_id = hirer_user_id;
    SELECT role INTO musician_role FROM profiles WHERE user_id = musician_user_id;
    
    -- If either user is admin, allow messaging
    IF hirer_role = 'admin' OR musician_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if there's a booking between these users with payment made
    -- Allow messaging if booking is accepted, completed, or has been paid
    SELECT EXISTS(
        SELECT 1 FROM bookings
        WHERE hirer_id = hirer_user_id
        AND musician_id = musician_user_id
        AND payment_status IN ('paid', 'partially_paid')
        AND status IN ('accepted', 'completed', 'pending')
    ) INTO has_paid_booking;
    
    RETURN has_paid_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Add comment to clarify review system
-- ============================================================================

COMMENT ON TABLE reviews IS 'Reviews left by hirers for musicians after completed bookings. Reviewer is the hirer, reviewee is the musician.';
COMMENT ON COLUMN reviews.reviewer_id IS 'User ID of the person leaving the review (typically the hirer)';
COMMENT ON COLUMN reviews.reviewee_id IS 'User ID of the person being reviewed (typically the musician)';
COMMENT ON FUNCTION can_users_message IS 'Check if two users can message each other. Returns true if there is a paid booking between them or if either is an admin.';
```

## How to Run

1. Go to your Supabase project dashboard at https://app.supabase.com
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste Migration #1 above
5. Click "Run" (or press Ctrl+Enter)
6. Wait for success message
7. Repeat steps 3-6 for Migration #2

## What This Fixes

### Pricing Display Issue
- Musicians can now set either hourly rates or flat fees
- The display will correctly show "per hour" for hourly rates and just the amount for flat fees

### Booking Count Issue
- Musician profiles will now correctly display the number of completed bookings
- The count updates automatically when bookings are completed

### Messaging Access Issue
- Hirers can now message musicians after making a payment (not just after completion)
- Messaging is enabled once payment status is 'paid' or 'partially_paid'
- This allows communication during the booking process

### Review System Issue
- Hirers can properly leave reviews for musicians
- The review system correctly updates musician ratings and review counts
- Reviews are properly linked to bookings
