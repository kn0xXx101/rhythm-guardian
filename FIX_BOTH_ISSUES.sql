-- FIX BOTH FINANCIAL MONITOR AND STAR RATINGS

-- ============================================================================
-- PART 1: CHECK CURRENT STATE
-- ============================================================================

-- Check transactions
SELECT 'TRANSACTIONS CHECK' as info, COUNT(*) as count FROM transactions;

-- Check reviews and ratings
SELECT 
    'RATINGS CHECK' as info,
    p.user_id,
    p.full_name,
    p.rating as stored_rating,
    p.total_reviews as stored_count,
    COUNT(r.id) as actual_review_count,
    ROUND(AVG(r.rating)::numeric, 2) as actual_average_rating
FROM profiles p
LEFT JOIN reviews r ON r.reviewee_id = p.user_id
WHERE p.role = 'musician'
GROUP BY p.user_id, p.full_name, p.rating, p.total_reviews;

-- ============================================================================
-- PART 2: FIX STAR RATINGS
-- ============================================================================

-- Update all musician profiles with correct ratings from reviews
UPDATE profiles p
SET 
    rating = COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM reviews
        WHERE reviewee_id = p.user_id
    ), 0),
    total_reviews = COALESCE((
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewee_id = p.user_id
    ), 0)
WHERE p.role = 'musician';

-- ============================================================================
-- PART 3: CREATE TRIGGER FOR AUTOMATIC RATING UPDATES
-- ============================================================================

-- Function to update musician rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_musician_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the musician's rating and review count
    UPDATE profiles
    SET 
        rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
        ), 0),
        total_reviews = COALESCE((
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
        ), 0),
        updated_at = NOW()
    WHERE user_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, DELETE on reviews
DROP TRIGGER IF EXISTS trigger_update_musician_rating ON reviews;
CREATE TRIGGER trigger_update_musician_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_musician_rating();

-- ============================================================================
-- PART 4: VERIFY FIXES
-- ============================================================================

-- Show updated ratings
SELECT 
    'UPDATED RATINGS' as info,
    user_id,
    full_name,
    rating,
    total_reviews
FROM profiles
WHERE role = 'musician' AND total_reviews > 0
ORDER BY rating DESC;

-- Show transaction count
SELECT 'FINAL TRANSACTION COUNT' as info, COUNT(*) as count FROM transactions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Star ratings have been fixed and will now update automatically!';
    RAISE NOTICE 'Check the Financial Monitor - if still showing zeros, transactions need to be created from bookings.';
END $$;