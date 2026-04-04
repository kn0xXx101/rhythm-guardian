-- Simple rating fix - just ensure ratings are calculated correctly
-- This migration focuses on making ratings visible everywhere

-- Update all musician profiles with correct ratings from existing reviews
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

-- Show current ratings
SELECT 
    'CURRENT RATINGS' as status,
    full_name,
    rating,
    total_reviews
FROM profiles
WHERE role = 'musician'
ORDER BY rating DESC NULLS LAST;