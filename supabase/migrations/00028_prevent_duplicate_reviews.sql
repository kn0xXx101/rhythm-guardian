-- Prevent duplicate reviews more strictly
-- This migration ensures that users can only leave one review per reviewee (not per booking)

-- First, let's see what duplicate reviews exist
DO $$
BEGIN
    RAISE NOTICE 'Checking for duplicate reviews...';
END $$;

-- Show duplicate reviews by reviewer and reviewee
SELECT 
    reviewer_id,
    reviewee_id,
    COUNT(*) as review_count,
    array_agg(id) as review_ids,
    array_agg(booking_id) as booking_ids
FROM reviews 
GROUP BY reviewer_id, reviewee_id 
HAVING COUNT(*) > 1;

-- Option 1: Keep only the latest review for each reviewer-reviewee pair
-- Delete older duplicate reviews, keeping only the most recent one
DELETE FROM reviews r1
WHERE EXISTS (
    SELECT 1 FROM reviews r2 
    WHERE r2.reviewer_id = r1.reviewer_id 
    AND r2.reviewee_id = r1.reviewee_id 
    AND r2.created_at > r1.created_at
);

-- Option 2: Add a stronger unique constraint (reviewer can only review each person once)
-- Drop the existing constraint
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_reviewer_id_key;

-- Add new constraint: one review per reviewer-reviewee pair
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_reviewee_unique 
UNIQUE (reviewer_id, reviewee_id);

-- Update the rating calculation to be more accurate
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

-- Show final review counts
SELECT 
    p.full_name,
    p.rating,
    p.total_reviews,
    COUNT(r.id) as actual_reviews
FROM profiles p
LEFT JOIN reviews r ON r.reviewee_id = p.user_id
WHERE p.role = 'musician'
GROUP BY p.user_id, p.full_name, p.rating, p.total_reviews
ORDER BY p.total_reviews DESC;