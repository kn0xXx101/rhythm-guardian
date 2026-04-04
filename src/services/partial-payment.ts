import { supabase } from '@/lib/supabase';

export interface PaymentSplit {
  deposit_amount: number;
  balance_amount: number;
}

export interface PaymentSplitRecord {
  id: string;
  booking_id: string;
  split_type: 'deposit' | 'balance' | 'full';
  amount: number;
  percentage: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paid_at: string | null;
  paystack_reference: string | null;
}

export const partialPaymentService = {
  /**
   * Calculate deposit and balance amounts
   */
  async calculateSplit(totalAmount: number, depositPercentage: number): Promise<PaymentSplit | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_payment_split' as any, {
        total_amount: totalAmount,
        deposit_percentage: depositPercentage,
      });

      if (error) throw error;
      return data as PaymentSplit;
    } catch (error) {
      console.error('Error calculating payment split:', error);
      return null;
    }
  },

  /**
   * Create a booking with split payment
   */
  async createSplitPaymentBooking(params: {
    bookingId: string;
    depositPercentage: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('bookings' as any)
        .update({
          payment_type: 'split',
          deposit_percentage: params.depositPercentage,
        })
        .eq('id', params.bookingId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, booking: data };
    } catch (error: any) {
      console.error('Error creating split payment booking:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Record deposit payment
   */
  async recordDepositPayment(params: {
    bookingId: string;
    transactionId: string;
    paystackReference: string;
  }) {
    try {
      // Update booking
      const { error: bookingError } = await supabase
        .from('bookings' as any)
        .update({
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
        })
        .eq('id', params.bookingId);

      if (bookingError) throw bookingError;

      // Create payment split record
      const { data: booking } = await supabase
        .from('bookings' as any)
        .select('deposit_amount, deposit_percentage')
        .eq('id', params.bookingId)
        .single();

      const { error: splitError } = await supabase
        .from('payment_splits' as any)
        .insert({
          booking_id: params.bookingId,
          transaction_id: params.transactionId,
          split_type: 'deposit',
          amount: booking.deposit_amount,
          percentage: booking.deposit_percentage,
          status: 'paid',
          paid_at: new Date().toISOString(),
          paystack_reference: params.paystackReference,
        });

      if (splitError) throw splitError;

      return { success: true };
    } catch (error: any) {
      console.error('Error recording deposit payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Record balance payment
   */
  async recordBalancePayment(params: {
    bookingId: string;
    transactionId: string;
    paystackReference: string;
  }) {
    try {
      // Update booking
      const { error: bookingError } = await supabase
        .from('bookings' as any)
        .update({
          balance_paid: true,
          balance_paid_at: new Date().toISOString(),
          payment_status: 'paid',
        })
        .eq('id', params.bookingId);

      if (bookingError) throw bookingError;

      // Create payment split record
      const { data: booking } = await supabase
        .from('bookings' as any)
        .select('balance_amount, deposit_percentage')
        .eq('id', params.bookingId)
        .single();

      const { error: splitError } = await supabase
        .from('payment_splits' as any)
        .insert({
          booking_id: params.bookingId,
          transaction_id: params.transactionId,
          split_type: 'balance',
          amount: booking.balance_amount,
          percentage: 100 - booking.deposit_percentage,
          status: 'paid',
          paid_at: new Date().toISOString(),
          paystack_reference: params.paystackReference,
        });

      if (splitError) throw splitError;

      return { success: true };
    } catch (error: any) {
      console.error('Error recording balance payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get payment splits for a booking
   */
  async getPaymentSplits(bookingId: string): Promise<PaymentSplitRecord[]> {
    try {
      const { data, error } = await supabase
        .from('payment_splits' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment splits:', error);
      return [];
    }
  },

  /**
   * Get booking payment status
   */
  async getPaymentStatus(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('booking_payment_status' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment status:', error);
      return null;
    }
  },

  /**
   * Check if balance payment is due
   */
  async isBalancePaymentDue(bookingId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('bookings' as any)
        .select('payment_type, deposit_paid, balance_paid, event_date, status')
        .eq('id', bookingId)
        .single();

      if (!data) return false;

      // Balance is due if:
      // 1. Payment type is split
      // 2. Deposit is paid
      // 3. Balance is not paid
      // 4. Service is completed or event date has passed
      const eventPassed = new Date(data.event_date) < new Date();
      const serviceCompleted = data.status === 'completed';

      return (
        data.payment_type === 'split' &&
        data.deposit_paid &&
        !data.balance_paid &&
        (eventPassed || serviceCompleted)
      );
    } catch (error) {
      console.error('Error checking balance payment due:', error);
      return false;
    }
  },
};
