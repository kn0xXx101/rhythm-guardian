import { supabase } from '@/lib/supabase';

export interface PayoutRecipient {
  type: 'nuban' | 'mobile_money' | 'basa';
  name: string;
  account_number: string;
  bank_code?: string;
  currency: string;
}

export interface PayoutRequest {
  bookingId: string;
  musicianId: string;
  amount: number;
  recipient: PayoutRecipient;
  reason?: string;
}

/**
 * Payout Service
 * Handles automatic fund release to musicians via Paystack Transfer API
 */
class PayoutService {
  /**
   * Check if a booking is eligible for automatic payout
   */
  async isEligibleForPayout(bookingId: string): Promise<boolean> {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('payment_status, service_confirmed_by_hirer, service_confirmed_by_musician, payout_released')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('Error checking payout eligibility:', error);
      return false;
    }

    const bookingData = booking as any;
    return (
      bookingData.payment_status === 'paid' &&
      bookingData.service_confirmed_by_hirer === true &&
      bookingData.service_confirmed_by_musician === true &&
      bookingData.payout_released === false
    );
  }

  /**
   * Get all bookings eligible for automatic payout
   */
  async getEligibleBookings(): Promise<string[]> {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_status', 'paid')
      .eq('service_confirmed_by_hirer', true)
      .eq('service_confirmed_by_musician', true)
      .eq('payout_released', false);

    if (error || !bookings) return [];

    return bookings.map((b) => b.id);
  }

  /**
   * Request automatic payout via Edge Function
   * This calls the Paystack Transfer API to send money to musician
   */
  async requestAutomaticPayout(bookingId: string): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/paystack-payout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to process payout');
    }

    const result = await response.json();
    return result;
  }

  /**
   * Process automatic payouts for all eligible bookings
   * This should be called by a scheduled job
   */
  async processAutomaticPayouts(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const eligibleBookings = await this.getEligibleBookings();
    
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const bookingId of eligibleBookings) {
      try {
        await this.requestAutomaticPayout(bookingId);
        processed++;
      } catch (error: any) {
        failed++;
        errors.push(`Booking ${bookingId}: ${error.message}`);
        console.error(`Failed to process payout for booking ${bookingId}:`, error);
      }
    }

    return { processed, failed, errors };
  }

  /**
   * Manually trigger payout for a specific booking
   * Used by admin when automatic payout fails or for manual override
   */
  async manualPayout(bookingId: string): Promise<void> {
    const eligible = await this.isEligibleForPayout(bookingId);
    
    if (!eligible) {
      throw new Error('Booking is not eligible for payout');
    }

    return this.requestAutomaticPayout(bookingId);
  }
}

export const payoutService = new PayoutService();
