-- CHECK WHAT THE CONSTRAINT IS ACTUALLY CHECKING

-- Get the exact constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass
  AND conname = 'transactions_status_check';

-- Show the failing row to understand what's wrong
SELECT 
    'SAMPLE TRANSACTION' as info,
    id,
    booking_id,
    user_id,
    type,
    amount,
    currency,
    description,
    status,
    payment_method,
    payment_reference,
    paystack_reference,
    platform_fee,
    metadata,
    created_at,
    updated_at
FROM transactions 
WHERE id = '4198ef42-380b-42bb-b5dd-f6e8deb1d15f';

-- Check for NULL values in all transactions
SELECT 
    'NULL VALUE ANALYSIS' as info,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN description IS NULL THEN 1 END) as null_description,
    COUNT(CASE WHEN payment_reference IS NULL THEN 1 END) as null_payment_reference,
    COUNT(CASE WHEN metadata IS NULL THEN 1 END) as null_metadata,
    COUNT(CASE WHEN net_amount IS NULL THEN 1 END) as null_net_amount,
    COUNT(CASE WHEN channel IS NULL THEN 1 END) as null_channel,
    COUNT(CASE WHEN authorization_code IS NULL THEN 1 END) as null_authorization_code
FROM transactions;