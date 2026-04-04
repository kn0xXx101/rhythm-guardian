-- INVESTIGATE TRANSACTION CONSTRAINT ISSUE
-- This will help us understand what's causing the constraint violation

-- 1. Check what constraints exist on the transactions table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass;

-- 2. Check the current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- 3. Check what payment_status enum values are allowed
SELECT 
    enumlabel as allowed_status_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'payment_status'
);

-- 4. Show current transaction data to understand the pattern
SELECT 
    'CURRENT TRANSACTIONS' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM transactions 
GROUP BY status;

-- 5. Try to identify what's causing the constraint violation
-- Let's see if there are any NULL values that shouldn't be NULL
SELECT 
    'NULL VALUE CHECK' as info,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id,
    COUNT(CASE WHEN type IS NULL THEN 1 END) as null_type,
    COUNT(CASE WHEN amount IS NULL THEN 1 END) as null_amount,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status,
    COUNT(CASE WHEN currency IS NULL THEN 1 END) as null_currency
FROM transactions;