-- Test booking expiration functionality

-- 1. Check current pending bookings that should be expired
SELECT 
  id,
  status,
  event_date,
  event_type,
  created_at,
  CASE 
    WHEN event_date < NOW() THEN 'Should be expired'
    ELSE 'Still valid'
  END as expiration_status
FROM bookings
WHERE status = 'pending'
ORDER BY event_date;

-- 2. Manually trigger the expiration function
SELECT * FROM check_and_expire_bookings();

-- 3. Check if any bookings were expired
SELECT 
  id,
  status,
  event_date,
  event_type,
  updated_at
FROM bookings
WHERE status = 'expired'
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Check if notifications were created
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.content,
  n.created_at,
  p.full_name as user_name
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
WHERE n.title LIKE '%Expired%'
ORDER BY n.created_at DESC
LIMIT 10;
