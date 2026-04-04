import { supabase } from '@/lib/supabase';

/**
 * Check and expire bookings that have passed their event date
 * This can be called from the bookings page to ensure expired bookings are marked
 */
export async function checkAndExpireBookings(): Promise<{
  success: boolean;
  expiredCount: number;
  message: string;
  error?: string;
}> {
  try {
    // Call the database function to check and expire bookings
    const { data, error } = await supabase.rpc('check_and_expire_bookings');

    if (error) {
      console.error('Error checking/expiring bookings:', error);
      return {
        success: false,
        expiredCount: 0,
        message: 'Failed to check bookings',
        error: error.message,
      };
    }

    const result = data?.[0] || { expired_count: 0, message: 'No bookings to expire' };

    console.log('Booking expiration check:', result);

    return {
      success: true,
      expiredCount: result.expired_count || 0,
      message: result.message || 'Check complete',
    };
  } catch (error) {
    console.error('Error in checkAndExpireBookings:', error);
    return {
      success: false,
      expiredCount: 0,
      message: 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a specific booking should be expired based on its event date
 */
export function shouldBookingBeExpired(eventDate: string | Date): boolean {
  const now = new Date();
  const event = new Date(eventDate);
  return event < now;
}
