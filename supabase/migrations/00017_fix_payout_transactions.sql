-- Migration: Fix payout transactions
-- Ensures that transaction records are created for all released payouts
-- so musicians can see their pending and completed payouts

-- Create missing transaction records for existing released payouts
INSERT INTO transactions (
  booking_id,
  user_id,
  amount,
  type,
  status,
  payment_method,
  currency,
  platform_fee,
  metadata
)
SELECT 
  b.id,
  b.musician_id,
  -- Calculate musician payout (total - platform fee - paystack fee)
  GREATEST(0, b.total_amount - (b.total_amount * 0.10) - (b.total_amount * 0.015 + 0.50)) as amount,
  'payout' as type,
  'pending' as status, -- Changed from 'paid' to 'pending' to avoid constraint violation
  'bank_transfer' as payment_method,
  'GHS' as currency,
  0 as platform_fee,
  jsonb_build_object(
    'auto_created', true,
    'payout_released', true,
    'payout_released_at', b.payout_released_at,
    'booking_completed_at', b.service_confirmed_at,
    'platform_fee_amount', b.total_amount * 0.10,
    'paystack_fee_amount', b.total_amount * 0.015 + 0.50
  ) as metadata
FROM bookings b
LEFT JOIN transactions t ON t.booking_id = b.id AND t.type = 'payout' AND t.user_id = b.musician_id
WHERE b.payout_released = TRUE
  AND b.payment_status = 'paid'
  AND t.id IS NULL;

-- Create function to automatically create payout transactions when payouts are released
CREATE OR REPLACE FUNCTION create_payout_transaction()
RETURNS TRIGGER AS $$
DECLARE
  musician_payout_amount DECIMAL(10,2);
  platform_fee_amount DECIMAL(10,2);
  paystack_fee_amount DECIMAL(10,2);
BEGIN
  -- Only proceed if payout was just released
  IF NEW.payout_released = TRUE AND (OLD.payout_released IS NULL OR OLD.payout_released = FALSE) THEN
    
    -- Calculate fees and payout amount
    platform_fee_amount := NEW.total_amount * 0.10; -- 10% platform fee
    paystack_fee_amount := NEW.total_amount * 0.015 + 0.50; -- 1.5% + GHS 0.50
    musician_payout_amount := GREATEST(0, NEW.total_amount - platform_fee_amount - paystack_fee_amount);
    
    -- Create transaction record for the payout
    INSERT INTO transactions (
      booking_id,
      user_id,
      amount,
      type,
      status,
      payment_method,
      currency,
      platform_fee,
      metadata
    ) VALUES (
      NEW.id,
      NEW.musician_id,
      musician_payout_amount,
      'payout',
      'pending',
      'bank_transfer',
      'GHS',
      0,
      jsonb_build_object(
        'platform_fee_amount', platform_fee_amount,
        'paystack_fee_amount', paystack_fee_amount,
        'payout_released_at', NEW.payout_released_at,
        'auto_created_by_trigger', true,
        'payout_released', true
      )
    );
    
    RAISE NOTICE 'Created payout transaction for booking % - Amount: %', NEW.id, musician_payout_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create payout transactions
DROP TRIGGER IF EXISTS trigger_create_payout_transaction ON bookings;
CREATE TRIGGER trigger_create_payout_transaction
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.payout_released IS DISTINCT FROM OLD.payout_released)
  EXECUTE FUNCTION create_payout_transaction();

-- Log the results
DO $$
DECLARE
  created_count INTEGER;
  total_payouts INTEGER;
  total_transactions INTEGER;
BEGIN
  -- Count created transactions
  SELECT COUNT(*) INTO created_count
  FROM transactions
  WHERE type = 'payout'
    AND metadata->>'auto_created' = 'true'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  -- Count total payouts and transactions
  SELECT COUNT(*) INTO total_payouts FROM bookings WHERE payout_released = TRUE;
  SELECT COUNT(*) INTO total_transactions FROM transactions WHERE type = 'payout';
  
  RAISE NOTICE 'Payout transaction fix completed:';
  RAISE NOTICE '- Created % missing transaction records', created_count;
  RAISE NOTICE '- Total released payouts: %', total_payouts;
  RAISE NOTICE '- Total payout transactions: %', total_transactions;
  RAISE NOTICE '- Added trigger for future payout transactions';
END $$;