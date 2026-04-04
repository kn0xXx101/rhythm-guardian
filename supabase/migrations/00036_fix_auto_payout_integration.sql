-- Fix auto-payout integration
-- 
-- ISSUE: The auto_complete_booking_on_confirmation trigger was setting payout_released = TRUE
-- when both parties confirm. That meant auto-process-payouts (cron) would NEVER find any 
-- bookings (it looks for payout_released = false). No actual Paystack transfer would happen.
--
-- FIX: Stop the trigger from setting payout_released. Only mark booking as completed.
-- The auto-process-payouts cron (or admin Release button) will do the actual Paystack 
-- transfer and set payout_released = true.

CREATE OR REPLACE FUNCTION auto_complete_booking_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If both parties have now confirmed, update status to completed
  -- DO NOT set payout_released here - let auto-process-payouts or admin do the actual Paystack transfer
  IF NEW.service_confirmed_by_hirer = TRUE 
     AND NEW.service_confirmed_by_musician = TRUE 
     AND (OLD.service_confirmed_by_hirer = FALSE OR OLD.service_confirmed_by_musician = FALSE) THEN
    
    NEW.status = 'completed';
    
    IF NEW.service_confirmed_at IS NULL THEN
      NEW.service_confirmed_at = NOW();
    END IF;
    
    RAISE NOTICE 'Booking % marked as completed. Payout will be processed by auto-process-payouts or admin.', NEW.id;
  END IF;
  
  -- If booking is being marked as expired and payment was made, mark for refund
  IF NEW.status = 'expired' AND OLD.status != 'expired' AND NEW.payment_status = 'paid' THEN
    NEW.payment_status = 'refunded';
    NEW.refund_amount = NEW.total_amount;
    NEW.refund_percentage = 100;
    NEW.refund_processed_at = NOW();
    NEW.refund_reference = 'AUTO_REFUND_EXPIRED_' || NEW.id;
    RAISE NOTICE 'Booking % expired - marked for full refund of %', NEW.id, NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_complete_booking_on_confirmation() IS 
  'Marks booking as completed when both parties confirm. Payout is processed separately by auto-process-payouts cron or admin Release button.';
