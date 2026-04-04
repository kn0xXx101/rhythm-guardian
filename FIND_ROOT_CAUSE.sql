-- FIND ROOT CAUSE OF CONSTRAINT ISSUE
-- This will show us exactly what the constraint is checking

-- 1. Show the exact constraint definition
SELECT 
    'CONSTRAINT DEFINITION' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass
  AND conname = 'transactions_status_check';

-- 2. Show the payment_status enum values
SELECT 
    'ALLOWED STATUS VALUES' as info,
    enumlabel as status_value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'payment_status'
)
ORDER BY enumsortorder;

-- 3. Check if there's a mismatch between column type and enum
SELECT 
    'COLUMN TYPE CHECK' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'status';

-- 4. Show a sample transaction to see its structure
SELECT 
    'SAMPLE TRANSACTION' as info,
    id,
    user_id,
    booking_id,
    type,
    amount,
    currency,
    status,
    payment_method,
    paystack_reference,
    platform_fee,
    created_at
FROM transactions 
LIMIT 1;

-- 5. Try to understand what values are actually in the status column
SELECT 
    'ACTUAL STATUS VALUES IN DB' as info,
    status,
    COUNT(*) as count
FROM transactions 
GROUP BY status;