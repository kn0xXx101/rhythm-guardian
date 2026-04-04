-- Fix bookings_with_profiles view to include rating and avatar data
-- This ensures ratings are displayed consistently across all booking pages

DROP VIEW IF EXISTS bookings_with_profiles CASCADE;

CREATE OR REPLACE VIEW bookings_with_profiles 
WITH (security_invoker = true) AS
SELECT 
    b.*,
    -- Hirer information
    h.full_name as hirer_name,
    h.email as hirer_email,
    h.avatar_url as hirer_avatar,
    -- Musician information with rating and avatar
    m.full_name as musician_name,
    m.email as musician_email,
    m.instruments as musician_instruments,
    m.rating as musician_rating,
    m.total_reviews as musician_total_reviews,
    m.avatar_url as musician_avatar,
    m.location as musician_location,
    m.bio as musician_bio
FROM bookings b
LEFT JOIN profiles h ON h.user_id = b.hirer_id
LEFT JOIN profiles m ON m.user_id = b.musician_id;

-- Add comment for documentation
COMMENT ON VIEW bookings_with_profiles IS 'Complete booking view with hirer and musician profile data including ratings';

-- Verify the view works correctly
SELECT 
    'VIEW TEST' as status,
    musician_name,
    musician_rating,
    musician_total_reviews
FROM bookings_with_profiles 
WHERE musician_rating IS NOT NULL
LIMIT 5;