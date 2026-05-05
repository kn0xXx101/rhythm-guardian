import { supabase } from '@/lib/supabase';
import { averageRatingFromSumCount, fetchReviewAggregatesForReviewees } from '@/lib/review-ratings';
import type { Booking, BookingStatus, PaymentStatus } from '@/contexts/BookingContext';
import { notifyAdmins } from '@/services/admin-notify';
import { inferLocationRegion } from '@/utils/location-search';

type DbBookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'in_progress' | 'expired';
type DbPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

// Map DB booking statuses to app-facing statuses used in the UI
const dbToAppStatus: Record<string, BookingStatus> = {
  pending: 'pending',
  accepted: 'accepted',
  in_progress: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'rejected',
  expired: 'expired',
};

// Map app-facing statuses back to DB enum values
const appToDbStatus: Record<string, DbBookingStatus> = {
  pending: 'pending',
  accepted: 'accepted',
  upcoming: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired', // Add expired status mapping
};

// Map DB payment statuses to app-facing statuses
const dbToAppPaymentStatus: Record<string, PaymentStatus> = {
  pending: 'unpaid',
  paid: 'paid_to_admin',
  refunded: 'service_completed',
  failed: 'unpaid',
};

// Map app-facing payment statuses back to DB enum values
const appToDbPaymentStatus: Record<string, DbPaymentStatus> = {
  unpaid: 'pending',
  paid_to_admin: 'paid',
  service_completed: 'paid',
  released: 'paid',
};

class BookingService {
  async getBookings(): Promise<Booking[]> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings_with_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatTimeValue = (value?: string) => {
        if (!value) return '';
        const timePart = value.includes('T') ? value.split('T')[1] ?? '' : value;
        const cleaned = timePart.replace('Z', '').split('+')[0] ?? '';
        const [hours, minutes] = cleaned.split(':');
        if (!hours || !minutes) return value;
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      };
      const formatTimeFromDate = (value?: string) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) return '';
        return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      };
      const addDurationToTime = (baseDate: string, hours: number) => {
        const parsed = new Date(baseDate);
        if (isNaN(parsed.getTime())) return '';
        parsed.setMinutes(parsed.getMinutes() + hours * 60);
        return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      };

      const list = (bookings || []).map((booking: any) => {
        const durationHours = booking.duration_hours ? Number(booking.duration_hours) : undefined;
        const startTime = formatTimeValue(booking.start_time) || formatTimeFromDate(booking.event_date);
        const endTime =
          formatTimeValue(booking.end_time) ||
          (startTime && durationHours && booking.event_date
            ? addDurationToTime(booking.event_date, durationHours)
            : '');
        const time = startTime ? (endTime ? `${startTime} - ${endTime}` : startTime) : '';

        return {
        id: booking.id || '',
        musician: {
          id: booking.musician_id || '',
          name: booking.musician_name || '',
          instrument: booking.musician_instruments?.[0] || '',
          image: booking.musician_avatar || '',
          rating: booking.musician_rating || 0,
        },
        client: {
          id: booking.hirer_id || '',
          name: booking.hirer_name || '',
          image: booking.hirer_avatar || '',
        },
        status: dbToAppStatus[booking.status] ?? 'pending',
        paymentStatus: dbToAppPaymentStatus[booking.payment_status] ?? 'unpaid',
        payoutStatus: booking.payout_released ? 'released' : 'pending',
        date: booking.event_date || '',
          time,
          durationHours,
        location: booking.location || '',
        price: Number(booking.total_amount) || 0,
        musicianPayout:
          booking.musician_payout != null && Number.isFinite(Number(booking.musician_payout))
            ? Number(booking.musician_payout)
            : undefined,
        description: booking.requirements || '',
        serviceConfirmedByHirer: booking.service_confirmed_by_hirer || false,
        serviceConfirmedByMusician: booking.service_confirmed_by_musician || false,
        serviceConfirmedAt: booking.service_confirmed_at || null,
        };
      });

      const participantIds = [
        ...new Set(
          list.flatMap((b) => [b.musician.id, b.client.id].filter((id) => typeof id === 'string' && id.length > 0))
        ),
      ];
      const { byRevieweeId, failed } = await fetchReviewAggregatesForReviewees(supabase, participantIds);

      return list.map((b) => {
        const mRow = b.musician.id ? byRevieweeId[b.musician.id] : undefined;
        const hRow = b.client.id ? byRevieweeId[b.client.id] : undefined;

        const musicianRating = failed
          ? Number(b.musician.rating) > 0
            ? Number(b.musician.rating)
            : 0
          : mRow && mRow.count > 0
            ? averageRatingFromSumCount(mRow.sum, mRow.count) ?? 0
            : 0;

        const hirerRating =
          failed || !hRow || hRow.count === 0
            ? undefined
            : averageRatingFromSumCount(hRow.sum, hRow.count) ?? undefined;

        return {
          ...b,
          musician: { ...b.musician, rating: musicianRating },
          client: { ...b.client, rating: hirerRating },
        };
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    try {
      const dbStatus = appToDbStatus[booking.status] ?? 'pending';
      const dbPaymentStatus = appToDbPaymentStatus[booking.paymentStatus] ?? 'pending';

      // Parse event_date - if it's a string, ensure it's a valid ISO timestamp
      let eventDate: string;
      if (typeof booking.date === 'string') {
        const dateObj = new Date(booking.date);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid event date');
        }
        eventDate = dateObj.toISOString();
      } else {
        eventDate = booking.date;
      }

      const rawDuration =
        booking.durationHours ??
        (booking as { duration?: number }).duration;
      const duration =
        typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 4;

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          musician_id: booking.musician.id,
          hirer_id: booking.client.id,
          status: dbStatus,
          payment_status: dbPaymentStatus,
          event_type: 'Performance',
          event_date: eventDate,
          duration_hours: duration,
          location: booking.location,
          total_amount: booking.price,
          requirements: booking.description || '',
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch the complete booking with musician and client details
      const completeBooking = await this.getBookings().then((bookings) =>
        bookings.find((b) => b.id === data.id)
      );

      if (!completeBooking) throw new Error('Failed to fetch complete booking details');

      return completeBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
    try {
      const { data: beforeUpdate } = await supabase
        .from('bookings_with_profiles')
        .select('id, status, hirer_name, musician_name')
        .eq('id', id)
        .maybeSingle();

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) {
        updateData.status = appToDbStatus[updates.status] ?? updates.status;
      }
      if (updates.paymentStatus !== undefined) {
        updateData.payment_status =
          appToDbPaymentStatus[updates.paymentStatus] ?? updates.paymentStatus;
      }
      if (updates.date !== undefined) {
        // Ensure date is in ISO format
        const dateObj = new Date(updates.date);
        updateData.event_date = dateObj.toISOString();
      }
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.price !== undefined) {
        updateData.total_amount = updates.price;
        updateData.budget = updates.price; // Update budget as well
      }
      if (updates.description !== undefined) updateData.requirements = updates.description;
      if (updates.serviceConfirmedByHirer !== undefined)
        updateData.service_confirmed_by_hirer = updates.serviceConfirmedByHirer;
      if (updates.serviceConfirmedByMusician !== undefined)
        updateData.service_confirmed_by_musician = updates.serviceConfirmedByMusician;
      if (updates.serviceConfirmedAt !== undefined)
        updateData.service_confirmed_at = updates.serviceConfirmedAt;

      const { error } = await supabase.from('bookings').update(updateData).eq('id', id);

      if (error) throw error;

      const previousStatus = String(beforeUpdate?.status || '');
      const nextStatus = String(updateData.status || previousStatus);
      if (nextStatus && previousStatus && nextStatus !== previousStatus) {
        const hirerName = beforeUpdate?.hirer_name || 'A hirer';
        const musicianName = beforeUpdate?.musician_name || 'a musician';
        const shortBookingId = id.slice(0, 8);

        let title = 'Booking status updated';
        let content = `${hirerName} / ${musicianName} booking ${shortBookingId} status changed from ${previousStatus} to ${nextStatus}.`;

        if (nextStatus === 'accepted' || nextStatus === 'in_progress') {
          title = 'Booking accepted';
          content = `${musicianName} accepted booking ${shortBookingId} from ${hirerName}.`;
        } else if (nextStatus === 'cancelled') {
          title = 'Booking cancelled';
          content = `Booking ${shortBookingId} between ${hirerName} and ${musicianName} was cancelled.`;
        } else if (nextStatus === 'rejected') {
          title = 'Booking rejected';
          content = `${musicianName} rejected booking ${shortBookingId} from ${hirerName}.`;
        } else if (nextStatus === 'completed') {
          title = 'Booking completed';
          content = `Booking ${shortBookingId} between ${hirerName} and ${musicianName} was marked completed.`;
        } else if (nextStatus === 'expired') {
          title = 'Booking expired';
          content = `Booking ${shortBookingId} between ${hirerName} and ${musicianName} has expired.`;
        }

        // Only notify admins for statuses NOT handled by the DB triggers
        // Handled by DB: accepted, upcoming, completed
        if (!['accepted', 'upcoming', 'completed'].includes(nextStatus)) {
          try {
            await notifyAdmins('booking', title, content, '/admin/bookings', {
              eventKey: `booking-status:${id}:${nextStatus}`,
            });
          } catch (notifyError) {
            console.error('Failed to notify admins about booking status update:', notifyError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    try {
      const { data: beforeUpdate } = await supabase
        .from('bookings_with_profiles')
        .select('id, payment_status, hirer_name, musician_name')
        .eq('id', id)
        .maybeSingle();

      const dbPaymentStatus = appToDbPaymentStatus[paymentStatus] || 'pending';

      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: dbPaymentStatus as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      const previousPaymentStatus = String(beforeUpdate?.payment_status || '');
      if (previousPaymentStatus !== dbPaymentStatus) {
        const hirerName = beforeUpdate?.hirer_name || 'A hirer';
        const musicianName = beforeUpdate?.musician_name || 'a musician';
        const shortBookingId = id.slice(0, 8);

        let title = 'Payment status updated';
        let content = `Payment status for booking ${shortBookingId} (${hirerName} / ${musicianName}) changed from ${previousPaymentStatus || 'unknown'} to ${dbPaymentStatus}.`;

        if (dbPaymentStatus === 'paid') {
          title = 'Booking payment received';
          content = `${hirerName} paid for booking ${shortBookingId} with ${musicianName}.`;
        } else if (dbPaymentStatus === 'refunded') {
          title = 'Booking refunded';
          content = `Refund processed for booking ${shortBookingId} (${hirerName} / ${musicianName}).`;
        }

        // Only notify admins for statuses NOT handled by the DB triggers
        // Handled by DB: paid
        if (dbPaymentStatus !== 'paid') {
          try {
            await notifyAdmins('payment', title, content, '/admin/bookings', {
              eventKey: `booking-payment-status:${id}:${dbPaymentStatus}`,
            });
          } catch (notifyError) {
            console.error('Failed to notify admins about payment status update:', notifyError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async updatePayoutStatus(_id: string, _payoutStatus: 'pending' | 'released'): Promise<void> {
    // Note: payout_status field doesn't exist in the database schema
    // This method is kept for API compatibility but does nothing
    console.warn(
      'updatePayoutStatus called but payout_status field does not exist in database schema'
    );
    // Could store this in a separate table or add the field via migration if needed
  }

  // Subscribe to booking changes
  subscribeToBookings(callback: (booking: Booking) => void) {
    return supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          // Fetch complete booking data when a change occurs
          const bookings = await this.getBookings();
          const newPayload = payload.new as { id: string };
          const updatedBooking = bookings.find((b) => b.id === newPayload.id);
          if (updatedBooking) {
            callback(updatedBooking);
          }
        }
      )
      .subscribe();
  }
}

export const bookingService = new BookingService();
