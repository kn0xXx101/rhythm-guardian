-- ============================================================================
-- COMPLETE NOTIFICATION DEBUG SCRIPT
-- ============================================================================

-- 1. Check if migration 00022 functions exist
SELECT 
    'Functions Check' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('notify_admins', 'notify_admins_on_booking_change', 'notify_admins_on_review');

-- 2. Check if triggers exist
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify_admins%';

-- 3. Check admin users exist
SELECT 
    'Admin Users' as check_type,
    user_id,
    full_name,
    email,
    role
FROM profiles
WHERE role = 'admin';

-- 4. Check recent notifications for ALL users (to see if any notifications are being created)
SELECT 
    'Recent Notifications' as check_type,
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
ORDER BY n.created_at DESC
LIMIT 20;

-- 5. Check recent bookings
SELECT 
    'Recent Bookings' as check_type,
    b.id,
    b.payment_status,
    b.status,
    b.service_confirmed_by_musician,
    b.service_confirmed_by_hirer,
    b.payout_released,
    b.created_at,
    b.updated_at,
    h.full_name as hirer_name,
    m.full_name as musician_name
FROM bookings b
LEFT JOIN profiles h ON h.user_id = b.hirer_id
LEFT JOIN profiles m ON m.user_id = b.musician_id
ORDER BY b.updated_at DESC
LIMIT 5;

-- 6. Test the notify_admins function directly
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Count admins
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    RAISE NOTICE 'Found % admin(s)', admin_count;
    
    -- Try to send test notification
    IF admin_count > 0 THEN
        PERFORM notify_admins(
            'system',
            '🧪 Debug Test',
            'Testing admin notification system - ' || NOW()::TEXT,
            '/admin',
            jsonb_build_object('test', true, 'timestamp', NOW())
        );
        RAISE NOTICE 'Test notification sent successfully';
    ELSE
        RAISE NOTICE 'No admins found - cannot send test notification';
    END IF;
END $$;

-- 7. Verify test notification was created
SELECT 
    'Test Notification Result' as check_type,
    n.id,
    p.full_name,
    p.email,
    p.role,
    n.type,
    n.title,
    n.content,
    n.created_at
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
WHERE n.title LIKE '%Debug Test%'
ORDER BY n.created_at DESC
LIMIT 5;
