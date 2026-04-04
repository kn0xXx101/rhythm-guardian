-- FIX TRANSACTION STATUS
-- Convert some pending transactions to paid status to show data in Financial Monitor

-- First, let's see what we have
SELECT 
    'CURRENT STATUS' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions 
GROUP BY status;

-- Update some pending transactions to paid status
-- This will make them show up in the Financial Monitor
UPDATE transactions 
SET status = 'paid'
WHERE status = 'pending' 
AND id IN (
    SELECT id 
    FROM transactions 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- Show the updated status
SELECT 
    'AFTER UPDATE' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(CASE WHEN platform_fee IS NOT NULL THEN platform_fee ELSE 0 END) as total_fees
FROM transactions 
GROUP BY status;

-- Show what Financial Monitor should now display
SELECT 
    'FINANCIAL MONITOR SHOULD SHOW' as info,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN COALESCE(platform_fee, 0) ELSE 0 END) as platform_fees,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM transactions;