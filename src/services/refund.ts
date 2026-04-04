import { supabase } from '@/lib/supabase';

export interface RefundCalculation {
  refund_amount: number;
  refund_percentage: number;
  policy_description: string;
}

export const refundService = {
  /**
   * Calculate refund amount for a booking
   */
  async calculateRefund(bookingId: string): Promise<RefundCalculation | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_refund_amount' as any, {
        booking_id: bookingId,
        cancellation_date: new Date().toISOString(),
      });

      if (error) throw error;
      return data as RefundCalculation;
    } catch (error) {
      console.error('Error calculating refund:', error);
      return null;
    }
  },

  /**
   * Request a refund for a booking
   */
  async requestRefund(params: {
    bookingId: string;
    userId: string;
    reason: string;
  }): Promise<{ success: boolean; error?: string; refund?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          bookingId: params.bookingId,
          userId: params.userId,
          reason: params.reason,
        },
      });

      if (error) throw error;

      return {
        success: true,
        refund: data.refund,
      };
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      return {
        success: false,
        error: error.message || 'Failed to process refund',
      };
    }
  },

  /**
   * Get refund policies
   */
  async getRefundPolicies() {
    try {
      const { data, error } = await supabase
        .from('refund_policies' as any)
        .select('*')
        .order('days_before_event', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching refund policies:', error);
      return [];
    }
  },

  /**
   * Get refunds for a booking
   */
  async getBookingRefunds(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('refunds' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching refunds:', error);
      return [];
    }
  },

  /**
   * Get all refunds (admin only)
   */
  async getAllRefunds() {
    try {
      const { data, error } = await supabase
        .from('refunds' as any)
        .select(`
          *,
          bookings (
            event_type,
            event_date,
            hirer_id,
            musician_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching all refunds:', error);
      return [];
    }
  },
};
