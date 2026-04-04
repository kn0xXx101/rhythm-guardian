-- DEBUG TRANSACTIONS ACCESS
-- Check if transactions exist and if there are any access issues

-- 1. Check total transactions in database
SELECT 'TOTAL TRANSACTIONS' as check, COUNT(*) as count FROM transactions;

-- 2. Check transactions by status
SELECT 
    'BY STATUS' as check,
    status,
    COUNT(*) as count
FROM transactions
GROUP BY status;

-- 3. Check if current user can see transactions
SELECT 
    'USER CAN SEE' as check,
    COUNT(*) as visible_count
FROM transactions;

-- 4. Show sample transactions with all fields
SELECT 
    'SAMPLE DATA' as check,
    id,
    user_id,
    booking_id,
    type,
    amount,
    status,
    platform_fee,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check RLS policies on transactions
SELECT 
    'RLS POLICIES' as check,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'transactions';