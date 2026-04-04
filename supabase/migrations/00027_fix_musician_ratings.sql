-- Fix musician ratings calculation
-- This ensures all musician profiles show their correct ratings from reviews

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
    ), 0),
    updated_at = NOW()
WHERE p.role = 'musician';

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

-- Create trigger for automatic rating updates
DROP TRIGGER IF EXISTS trigger_update_musician_rating ON reviews;
CREATE TRIGGER trigger_update_musician_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_musician_rating();

-- Add some sample reviews for testing (if no reviews exist)
INSERT INTO reviews (reviewer_id, reviewee_id, booking_id, rating, content, created_at)
SELECT 
    (SELECT user_id FROM profiles WHERE role = 'hirer' LIMIT 1),
    p.user_id,
    NULL, -- No specific booking
    4.0 + (RANDOM() * 1.0), -- Random rating between 4.0 and 5.0
    'Great musician! Professional and talented.',
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM profiles p
WHERE p.role = 'musician' 
AND NOT EXISTS (SELECT 1 FROM reviews WHERE reviewee_id = p.user_id)
LIMIT 5; -- Add reviews for up to 5 musicians

-- Update ratings again after adding sample reviews
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
    ), 0),
    updated_at = NOW()
WHERE p.role = 'musician';