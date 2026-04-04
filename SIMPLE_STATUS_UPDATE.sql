-- SIMPLE STATUS UPDATE
-- Just update the pending transactions to paid without schema changes

-- Step 1: Show current status
SELECT 
    'BEFORE UPDATE' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions 
GROUP BY status;

-- Step 2: Update pending booking_payment transactions to paid
-- These are completed payments that got stuck with wrong status
UPDATE transactions 
SET status = 'paid'
WHERE status = 'pending'
  AND type = 'booking_payment'
  AND paystack_reference IS NOT NULL
  AND paystack_reference != '';

-- Step 3: Show results after update
SELECT 
    'AFTER UPDATE' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(COALESCE(platform_fee, 0)) as total_fees
FROM transactions 
GROUP BY status;

-- Step 4: Show what Financial Monitor should display
SELECT 
    'FINANCIAL MONITOR RESULTS' as info,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN COALESCE(platform_fee, 0) ELSE 0 END) as platform_fees,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM transactions;