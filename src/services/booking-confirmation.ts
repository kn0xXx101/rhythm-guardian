import { supabase } from '@/lib/supabase';
import { payoutService } from '@/services/payout';

/**
 * Service confirmation utility with enhanced error handling
 */
export class BookingConfirmationService {
  /**
   * Confirm service completion with better error handling
   */
  static async confirmService(bookingId: string, role: 'hirer' | 'musician'): Promise<void> {
    try {
      // First, try to use the database function if it exists
      try {
        const { data, error } = await supabase.rpc('confirm_service' as any, {
          booking_id: bookingId,
          confirming_role: role
        });

        if (error) {
          // If the function doesn't exist, fall back to direct update
          if (error.message.includes('function') && error.message.includes('does not exist')) {
            await this.fallbackConfirmService(bookingId, role);
            return;
          }
          throw new Error(`Database error: ${error.message}`);
        }

        const result = data as any;
        if (!result?.success) {
          const errorMessage = result?.error || 'Unknown error occurred';
          throw new Error(errorMessage);
        }

        console.log('Service confirmed successfully:', result.message);

        // If both parties are now confirmed, try to trigger automatic payout.
        // This will only succeed when the booking is eligible and the caller is authorized.
        try {
          const eligible = await payoutService.isEligibleForPayout(bookingId);
          if (eligible) {
            await payoutService.requestAutomaticPayout(bookingId);
          }
        } catch (payoutError) {
          console.warn('Automatic payout attempt failed (non-blocking):', payoutError);
        }
      } catch (rpcError: any) {
        // If RPC fails, use fallback method
        if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
          await this.fallbackConfirmService(bookingId, role);
          return;
        }
        throw rpcError;
      }
    } catch (error) {
      console.error('Error in confirmService:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('Booking not found. Please refresh and try again.');
        } else if (error.message.includes('Invalid role')) {
          throw new Error('Invalid user role for this operation.');
        } else if (error.message.includes('permission')) {
          throw new Error('You do not have permission to perform this action.');
        } else {
          throw new Error(`Failed to confirm service: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  }

  /**
   * Fallback method for service confirmation when database function is not available
   */
  private static async fallbackConfirmService(bookingId: string, role: 'hirer' | 'musician'): Promise<void> {
    console.log(`Fallback confirm service for booking ${bookingId} by ${role}`);
    
    // First, fetch the current booking
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to fetch booking: ${fetchError.message}`);
    }

    if (!currentBooking) {
      throw new Error('Booking not found');
    }

    console.log('Current booking:', currentBooking);

    // Prepare the update
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (role === 'hirer') {
      updateData.service_confirmed_by_hirer = true;
    } else if (role === 'musician') {
      updateData.service_confirmed_by_musician = true;
    } else {
      throw new Error('Invalid role specified');
    }

    // Check if both parties will be confirmed after this update
    const willBeFullyConfirmed = role === 'hirer' 
      ? currentBooking.service_confirmed_by_musician 
      : currentBooking.service_confirmed_by_hirer;

    console.log('Will be fully confirmed:', willBeFullyConfirmed);

    // If this confirmation completes the service, update status
    if (willBeFullyConfirmed) {
      updateData.status = 'completed';
    }

    console.log('Update data:', updateData);

    // Perform the update
    const { data: updatedData, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    console.log('Update successful:', updatedData);

    // Try to trigger automatic payout after database update (non-blocking).
    // The edge function will enforce eligibility and only mark payout released on success.
    try {
      const eligible = await payoutService.isEligibleForPayout(bookingId);
      if (eligible) {
        await payoutService.requestAutomaticPayout(bookingId);
      }
    } catch (payoutError) {
      console.warn('Automatic payout attempt failed (non-blocking):', payoutError);
    }
  }

  /**
   * Check if both parties have confirmed service completion
   */
  static async isServiceFullyConfirmed(bookingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('service_confirmed_by_hirer, service_confirmed_by_musician')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error checking service confirmation:', error);
        return false;
      }

      return Boolean(data.service_confirmed_by_hirer && data.service_confirmed_by_musician);
    } catch (error) {
      console.error('Error in isServiceFullyConfirmed:', error);
      return false;
    }
  }

  /**
   * Get service confirmation status for a booking
   */
  static async getConfirmationStatus(bookingId: string): Promise<{
    hirerConfirmed: boolean;
    musicianConfirmed: boolean;
    fullyConfirmed: boolean;
    confirmedAt: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('service_confirmed_by_hirer, service_confirmed_by_musician, service_confirmed_at')
        .eq('id', bookingId)
        .single();

      if (error) {
        throw new Error(`Failed to get confirmation status: ${error.message}`);
      }

      const hirerConfirmed = Boolean(data.service_confirmed_by_hirer);
      const musicianConfirmed = Boolean(data.service_confirmed_by_musician);
      const fullyConfirmed = hirerConfirmed && musicianConfirmed;

      return {
        hirerConfirmed,
        musicianConfirmed,
        fullyConfirmed,
        confirmedAt: data.service_confirmed_at
      };
    } catch (error) {
      console.error('Error in getConfirmationStatus:', error);
      throw error;
    }
  }
}