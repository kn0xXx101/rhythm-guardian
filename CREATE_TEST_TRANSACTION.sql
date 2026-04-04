-- Create a test transaction for Financial Monitor
-- Run this only if the built-in debug tools don't work

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
    'TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    150.00,
    'Test transaction for Financial Monitor'
FROM profiles 
LIMIT 1;

-- Verify the result
SELECT 
    'Financial Monitor should show' as info,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN platform_fee ELSE 0 END) as platform_fees,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count
FROM transactions;