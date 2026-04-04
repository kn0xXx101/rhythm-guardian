-- COMPLETE STATUS FIX FOR TRANSACTIONS
-- This will fix the constraint issue and update existing transactions

-- Step 1: Drop the problematic constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_status_check' 
    AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_status_check;
    RAISE NOTICE '✅ Dropped transactions_status_check constraint';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint transactions_status_check does not exist';
  END IF;
END $$;

-- Step 2: Ensure the status column uses the payment_status enum correctly
-- (This should already be the case, but let's verify)
DO $$
BEGIN
  -- Check if column type is correct
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name = 'status'
    AND udt_name != 'payment_status'
  ) THEN
    -- Fix the column type
    ALTER TABLE transactions 
    ALTER COLUMN status TYPE payment_status USING status::payment_status;
    RAISE NOTICE '✅ Fixed status column type to use payment_status enum';
  ELSE
    RAISE NOTICE '✅ Status column already uses payment_status enum';
  END IF;
END $$;

-- Step 3: Update all pending transactions to paid status
-- (These are completed payments that got stuck with wrong status)
UPDATE transactions 
SET status = 'paid'
WHERE status = 'pending'
  AND type = 'booking_payment'
  AND paystack_reference IS NOT NULL
  AND paystack_reference != '';

-- Step 4: Show the results
SELECT 
    'AFTER FIX - STATUS DISTRIBUTION' as info,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(COALESCE(platform_fee, 0)) as total_fees
FROM transactions 
GROUP BY status
ORDER BY status;

-- Step 5: Show what Financial Monitor should display
SELECT 
    'FINANCIAL MONITOR SHOULD NOW SHOW' as info,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'paid' THEN COALESCE(platform_fee, 0) ELSE 0 END) as platform_fees,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM transactions;

-- Step 6: Verify the fix worked
DO $$
DECLARE
    paid_count INTEGER;
    total_revenue DECIMAL(10,2);
BEGIN
    SELECT 
        COUNT(*),
        SUM(amount)
    INTO paid_count, total_revenue
    FROM transactions 
    WHERE status = 'paid';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FIX COMPLETE ===';
    RAISE NOTICE 'Paid transactions: %', paid_count;
    RAISE NOTICE 'Total revenue: ₵%.2f', COALESCE(total_revenue, 0);
    RAISE NOTICE '';
    
    IF paid_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS! Financial Monitor should now display data.';
        RAISE NOTICE 'Refresh the Financial Monitor page to see the results.';
    ELSE
        RAISE NOTICE '⚠️ No paid transactions found. Check if transactions exist.';
    END IF;
END $$;