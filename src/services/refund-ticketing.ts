import { supabase } from '@/lib/supabase';
import { bookingService } from '@/services/booking';

export const refundTicketingService = {
  /**
   * Creates a high-priority support ticket for a refund request
   * instead of instantly refunding the money.
   */
  async createRefundTicket(params: {
    bookingId: string;
    userId: string;
    reason: string;
    musicianName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Refund Request Investigation - Booking #${params.bookingId.slice(0, 8)}`;
      let originalMessage = `REFUND REQUEST for Booking ID: ${params.bookingId}\n`;
      if (params.musicianName) {
        originalMessage += `Musician: ${params.musicianName}\n`;
      }
      originalMessage += `\nUser Reason:\n"${params.reason}"\n\nPlease investigate if services were rendered before manually releasing funds or processing the refund.`;

      // Use the existing RPC for creating support tickets
      const { error: ticketError } = await supabase.rpc('create_support_ticket' as any, {
        p_user_id: params.userId,
        p_subject: subject,
        p_original_message: originalMessage,
        p_priority: 'high'
      });

      if (ticketError) throw ticketError;

      // Update the booking payment status to indicate a refund is pending/investigating
      // This ensures the user sees that their request is being handled
      await bookingService.updateBooking(params.bookingId, { 
        paymentStatus: 'refund_pending' as any
      });

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error creating refund ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit refund request ticket',
      };
    }
  }
};
