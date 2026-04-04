-- CREATE TRANSACTIONS FROM EXISTING BOOKINGS
-- This will populate the transactions table from completed bookings

-- First, check what we have
SELECT 'CURRENT STATE' as info, 
    (SELECT COUNT(*) FROM transactions) as transaction_count,
    (SELECT COUNT(*) FROM bookings WHERE payment_status = 'paid') as paid_bookings_count;

-- Create transactions for all paid bookings that don't have transaction records yet
INSERT INTO transactions (
    user_id,
    booking_id,
    type,
    amount,
    currency,
    status,
    payment_method,
    paystack_reference,
    platform_fee,
    description,
    created_at,
    updated_at
)
SELECT 
    b.hirer_id as user_id,
    b.id as booking_id,
    'booking_payment' as type,
    b.total_amount as amount,
    'GHS' as currency,
    'paid' as status,
    'card' as payment_method,
    'BOOKING-' || b.id::text as paystack_reference,
    ROUND((b.total_amount * 0.15)::numeric, 2) as platform_fee, -- 15% platform fee
    'Payment for ' || b.event_type || ' booking' as description,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN transactions t ON t.booking_id = b.id AND t.type = 'booking_payment'
WHERE b.payment_status = 'paid'
  AND t.id IS NULL; -- Only create if transaction doesn't exist

-- Show what was created
SELECT 
    'TRANSACTIONS CREATED' as info,
    COUNT(*) as new_transactions
FROM transactions
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Show final state
SELECT 
    'FINAL STATE' as info,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN platform_fee ELSE 0 END) as total_platform_fees
FROM transactions;

-- Show sample transactions
SELECT 
    'SAMPLE TRANSACTIONS' as info,
    LEFT(id::text, 8) as short_id,
    type,
    amount,
    status,
    platform_fee,
    paystack_reference,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;