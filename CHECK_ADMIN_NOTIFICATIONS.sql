-- Check if notify_admins function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('notify_admins', 'notify_admins_on_booking_change');

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify_admins%';

-- Check admin users
SELECT 
    user_id,
    full_name,
    email,
    role
FROM profiles
WHERE role = 'admin';

-- Check recent notifications for admins
SELECT 
    n.id,
    n.user_id,
    p.full_name,
    p.role,
    n.type,
    n.title,
    n.content,
    n.created_at
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
WHERE p.role = 'admin'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check recent bookings to see if triggers should have fired
SELECT 
    id,
    hirer_id,
    musician_id,
    payment_status,
    status,
    musician_confirmed,
    hirer_confirmed,
    created_at,
    updated_at
FROM bookings
ORDER BY updated_at DESC
LIMIT 5;
