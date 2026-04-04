-- CHECK ACTUAL TRANSACTION STATUS IN DATABASE
-- Let's see what the real data looks like

-- Show all transactions with their actual status
SELECT 
    'ALL TRANSACTIONS' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(COALESCE(platform_fee, 0)) as total_fees
FROM transactions 
GROUP BY status
ORDER BY status;

-- Show individual transactions to see the pattern
SELECT 
    'TRANSACTION DETAILS' as info,
    LEFT(id::text, 8) as short_id,
    type,
    amount,
    status,
    platform_fee,
    paystack_reference,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 15;

-- Count by exact status value
SELECT 
    'EXACT STATUS COUNT' as info,
    status::text as status_text,
    COUNT(*) as count
FROM transactions
GROUP BY status::text;