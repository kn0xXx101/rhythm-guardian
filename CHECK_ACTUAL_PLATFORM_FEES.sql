-- CHECK ACTUAL PLATFORM FEES IN DATABASE
-- See what's actually stored for the 2 completed transactions

SELECT 
    'PAID TRANSACTIONS DETAIL' as info,
    LEFT(id::text, 8) as short_id,
    amount,
    platform_fee,
    CASE 
        WHEN amount > 0 THEN ROUND((platform_fee / amount * 100)::numeric, 2)
        ELSE 0
    END as actual_fee_percentage,
    status,
    type,
    created_at
FROM transactions
WHERE status = 'paid'
ORDER BY created_at DESC;

-- Calculate what the Financial Monitor should show
SELECT 
    'FINANCIAL MONITOR CALCULATION' as info,
    COUNT(*) as paid_count,
    SUM(amount) as total_revenue,
    SUM(platform_fee) as total_platform_fees,
    CASE 
        WHEN SUM(amount) > 0 THEN ROUND((SUM(platform_fee) / SUM(amount) * 100)::numeric, 2)
        ELSE 0
    END as average_fee_percentage
FROM transactions
WHERE status = 'paid';