import { supabase } from '@/lib/supabase';
import { bookingService } from '@/services/booking';
import { notifyAdmins } from '@/services/admin-notify';

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
    /** Recorded on the ticket for fraud review (UI requires all true before submit). */
    hirerAttestations?: {
      paidOnlyThroughPlatform: boolean;
      didNotCoordinateToSkipConfirmation: boolean;
      reportingTruthfully: boolean;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Refund Request Investigation - Booking #${params.bookingId.slice(0, 8)}`;
      let originalMessage = `REFUND REQUEST for Booking ID: ${params.bookingId}\n`;
      if (params.musicianName) {
        originalMessage += `Musician: ${params.musicianName}\n`;
      }
      originalMessage += `\nUser Reason:\n"${params.reason}"\n`;
      if (params.hirerAttestations) {
        const a = params.hirerAttestations;
        originalMessage += `\n--- Hirer confirmations (submitted with request) ---\n`;
        originalMessage += `Paid only through platform: ${a.paidOnlyThroughPlatform ? 'YES' : 'NO'}\n`;
        originalMessage += `Did not coordinate to skip in-app confirmation: ${a.didNotCoordinateToSkipConfirmation ? 'YES' : 'NO'}\n`;
        originalMessage += `Reporting truthfully: ${a.reportingTruthfully ? 'YES' : 'NO'}\n`;
      }
      originalMessage += `\nPlease investigate using platform payment status, booking timestamps, chat where available, and service confirmations before releasing funds or processing the refund.`;

      // Prefer RPC, but fall back to direct insert if function is unavailable on the current project.
      const { data: ticketId, error: ticketError } = await supabase.rpc('create_support_ticket' as any, {
        p_user_id: params.userId,
        p_subject: subject,
        p_message: originalMessage,
        p_category: 'billing',
        p_priority: 'high',
      });

      if (ticketError) {
        console.warn('create_support_ticket RPC failed, using fallback insert:', ticketError);
        const { error: insertError } = await supabase.from('support_tickets').insert({
          user_id: params.userId,
          status: 'open',
          priority: 'high',
          category: 'billing',
          subject,
          original_message: originalMessage,
          user_role: 'hirer',
          session_status: 'waiting_admin',
          last_activity_at: new Date().toISOString(),
        } as any);
        if (insertError) throw insertError;
      } else {
        // Best-effort admin notifications if RPC returned a ticket id
        if (ticketId) {
          await supabase.rpc('notify_admins_about_ticket', { p_ticket_id: ticketId } as any).catch(() => {});
        }
      }

      // Some deployed DBs still enforce a strict payment_status constraint
      // without `refund_pending`. We keep ticket creation successful even if
      // this status update is rejected.
      try {
        await bookingService.updateBooking(params.bookingId, {
          paymentStatus: 'refund_pending' as any,
        });
      } catch (statusError) {
        console.warn('Refund status update skipped due to DB constraint:', statusError);
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error creating refund ticket:', error);
      // Last fallback: still mark booking for manual review and notify admins directly.
      try {
        try {
          await bookingService.updateBooking(params.bookingId, { paymentStatus: 'refund_pending' as any });
        } catch (statusError) {
          console.warn('Refund status update skipped due to DB constraint:', statusError);
        }
        await notifyAdmins(
          'booking',
          'Manual refund review required',
          `Refund request received for booking ${params.bookingId.slice(0, 8)}… but ticket creation failed. Please review manually.`,
          '/admin/bookings'
        );
        return { success: true };
      } catch (fallbackError: any) {
        return {
          success: false,
          error:
            fallbackError?.message ||
            error?.message ||
            'Failed to submit refund request ticket',
        };
      }
    }
  }
};
