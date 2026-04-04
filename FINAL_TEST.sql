-- FINAL TEST - Create one transaction to test Financial Monitor

-- Check if we have users
SELECT 'Users available' as check, COUNT(*) as count FROM profiles;

-- Create one test transaction
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    payment_method,
    paystack_reference,
    platform_fee,
    description
) 
SELECT 
    user_id,
    'booking_payment',
    1500.00,
    'GHS',
    'paid',
    'card',
    'FINAL-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    150.00,
    'Final test transaction for Financial Monitor'
FROM profiles 
LIMIT 1;

-- Show what Financial Monitor should display
SELECT 
    'EXPECTED RESULTS' as info,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN platform_fee ELSE 0 END) as platform_fees,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM transactions;