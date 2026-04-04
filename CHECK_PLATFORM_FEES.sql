-- CHECK PLATFORM FEES CALCULATION
-- Verify the platform fees are calculated correctly

-- Show all paid transactions with their platform fees
SELECT 
    'PAID TRANSACTIONS' as info,
    LEFT(id::text, 8) as short_id,
    type,
    amount,
    platform_fee,
    status,
    paystack_reference,
    created_at
FROM transactions
WHERE status = 'paid'
ORDER BY created_at DESC;

-- Calculate total platform fees from paid transactions
SELECT 
    'PLATFORM FEE CALCULATION' as info,
    COUNT(*) as paid_transaction_count,
    SUM(amount) as total_revenue,
    SUM(COALESCE(platform_fee, 0)) as total_platform_fees,
    AVG(COALESCE(platform_fee, 0)) as avg_platform_fee,
    SUM(amount) * 0.10 as expected_fees_at_10_percent
FROM transactions
WHERE status = 'paid';

-- Show breakdown by transaction
SELECT 
    'INDIVIDUAL BREAKDOWN' as info,
    LEFT(id::text, 8) as short_id,
    amount,
    platform_fee,
    ROUND((platform_fee / NULLIF(amount, 0) * 100)::numeric, 2) as fee_percentage
FROM transactions
WHERE status = 'paid'
ORDER BY created_at DESC;