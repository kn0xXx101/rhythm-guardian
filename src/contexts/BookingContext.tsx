import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { bookingService } from '@/services/booking';
import { BookingConfirmationService } from '@/services/booking-confirmation';
import { useRealtime } from '@/hooks/use-realtime';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services/notificationsService';
import { notifyAdmins } from '@/services/admin-notify';

export type BookingStatus = 'pending' | 'accepted' | 'upcoming' | 'completed' | 'cancelled' | 'expired' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid_to_admin' | 'service_completed' | 'released' | 'refunded' | 'refund_pending' | 'paid';

export interface Booking {
  id: string;
  musician: {
    id: string;
    name: string;
    instrument: string;
    image: string;
    rating: number;
  };
  client: {
    id: string;
    name: string;
    image: string;
    /** Average rating from reviews where this hirer is the reviewee */
    rating?: number;
  };
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  payoutStatus?: 'pending' | 'released';
  date: string;
  time: string;
  durationHours?: number;
  location: string;
  price: number;
  description: string;
  serviceConfirmedByHirer?: boolean;
  serviceConfirmedByMusician?: boolean;
  serviceConfirmedAt?: string;
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id'>) => Promise<void>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus) => Promise<void>;
  updatePayoutStatus: (id: string, payoutStatus: 'pending' | 'released') => Promise<void>;
  confirmService: (id: string, role: 'hirer' | 'musician') => Promise<void>;
  refetch: (options?: { silent?: boolean }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBookingContext = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingContext must be used within BookingProvider');
  return ctx;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const realtimeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBookings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      if (!silent) setIsLoading(true);
      const data = await bookingService.getBookings();
      setBookings(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        console.log('Bookings table not yet created, showing empty state');
        setBookings([]);
        setError(null);
      } else {
        setError('Failed to load bookings');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const scheduleRealtimeSync = useCallback(() => {
    if (realtimeSyncTimerRef.current) {
      clearTimeout(realtimeSyncTimerRef.current);
    }
    realtimeSyncTimerRef.current = setTimeout(() => {
      realtimeSyncTimerRef.current = null;
      void fetchBookings({ silent: true });
    }, 320);
  }, [fetchBookings]);

  // Get current user ID for real-time subscriptions
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    return () => {
      if (realtimeSyncTimerRef.current) {
        clearTimeout(realtimeSyncTimerRef.current);
      }
    };
  }, []);

  // Set up real-time updates for bookings (silent refetch — avoids full-page loading flicker)
  useRealtime({
    table: 'bookings',
    filter: userId ? `or(hirer_id.eq.${userId},musician_id.eq.${userId})` : undefined,
    onInsert: () => {
      scheduleRealtimeSync();
    },
    onUpdate: () => {
      scheduleRealtimeSync();
    },
    onDelete: async (payload) => {
      setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
    },
    onError: (err) => {
      console.error('Real-time booking subscription error:', err);
    },
  });

  const addBooking = async (booking: Omit<Booking, 'id'>) => {
    try {
      const newBooking = await bookingService.createBooking(booking);
      setBookings((prev) => [...prev, newBooking]);
    } catch (err) {
      console.error('Error adding booking:', err);
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    try {
      await bookingService.updateBooking(id, updates);
      setBookings((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index >= 0) {
          const newBookings = [...prev];
          const existing = newBookings[index];
          if (!existing) {
            return prev;
          }
          const { id: _ignoreId, ...rest } = updates;
          const updated: Booking = { ...existing, ...rest };
          newBookings[index] = updated;
          return newBookings;
        }
        return prev;
      });
    } catch (err) {
      console.error('Error updating booking:', err);
      throw err;
    }
  };

  const updatePaymentStatus = async (id: string, paymentStatus: PaymentStatus) => {
    try {
      await bookingService.updatePaymentStatus(id, paymentStatus);
      setBookings((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index >= 0) {
          const newBookings = [...prev];
          const existing = newBookings[index];
          if (!existing) {
            return prev;
          }
          const updated: Booking = { ...existing, paymentStatus };
          newBookings[index] = updated;
          return newBookings;
        }
        return prev;
      });
    } catch (err) {
      console.error('Error updating payment status:', err);
      throw err;
    }
  };

  const updatePayoutStatus = async (id: string, payoutStatus: 'pending' | 'released') => {
    try {
      await bookingService.updatePayoutStatus(id, payoutStatus);
      setBookings((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index >= 0) {
          const newBookings = [...prev];
          const existing = newBookings[index];
          if (!existing) {
            return prev;
          }
          const updated: Booking = { ...existing, payoutStatus };
          newBookings[index] = updated;
          return newBookings;
        }
        return prev;
      });
    } catch (err) {
      console.error('Error updating payout status:', err);
      throw err;
    }
  };

  const confirmService = async (id: string, role: 'hirer' | 'musician') => {
    try {
      // Use the enhanced confirmation service
      await BookingConfirmationService.confirmService(id, role);
      
      // Get current booking to check if both parties have confirmed
      const booking = bookings.find((b) => b.id === id);
      if (!booking) return;

      // Determine if service will be fully confirmed after this update
      const willBeFullyConfirmed = 
        role === 'hirer' 
          ? booking.serviceConfirmedByMusician 
          : booking.serviceConfirmedByHirer;
      
      // Update local state
      const updates: Partial<Booking> =
        role === 'hirer' 
          ? { serviceConfirmedByHirer: true } 
          : { serviceConfirmedByMusician: true };
      
      // If both parties have now confirmed, mark as completed and release payout
      if (willBeFullyConfirmed) {
        updates.status = 'completed';
        updates.serviceConfirmedAt = new Date().toISOString();
        
        // Auto-release payout if payment has been received
        if (
          booking.paymentStatus === 'paid_to_admin' ||
          booking.paymentStatus === 'paid' ||
          booking.paymentStatus === 'service_completed'
        ) {
          updates.payoutStatus = 'released';
        }
      }
      
      setBookings((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index >= 0) {
          const newBookings = [...prev];
          const existing = newBookings[index];
          if (existing) {
            const updated: Booking = { ...existing, ...updates };
            newBookings[index] = updated;
          }
          return newBookings;
        }
        return prev;
      });

      // Send notifications
      const targetUserId = role === 'hirer' ? booking.musician.id : booking.client.id;
      const actorName = role === 'hirer' ? booking.client.name : booking.musician.name;
      const recipientRole = role === 'hirer' ? 'musician' : 'hirer';
      
      try {
        if (willBeFullyConfirmed) {
          // Notify both parties about completion
          await notificationsService.createNotification({
            user_id: targetUserId,
            type: 'booking',
            title: 'Service Completed & Payment Released! 🎉',
            message: `Both parties have confirmed service completion. ${recipientRole === 'musician' ? 'Your payment has been automatically released!' : 'The musician\'s payment has been released.'}`,
            link: `/${recipientRole}/bookings`,
            is_read: false,
            priority: 'high',
            data: { bookingId: id, payoutReleased: true },
          });
          
          // Also notify the confirming party
          const confirmingUserId = role === 'hirer' ? booking.client.id : booking.musician.id;
          await notificationsService.createNotification({
            user_id: confirmingUserId,
            type: 'booking',
            title: 'Service Completed! ✓',
            message: `You've confirmed service completion. The booking is now complete${role === 'musician' ? ' and your payment has been released!' : '!'}`,
            link: `/${role === 'hirer' ? 'hirer' : 'musician'}/bookings`,
            is_read: false,
            priority: 'high',
            data: { bookingId: id, payoutReleased: role === 'musician' },
          });

          await notifyAdmins(
            'booking',
            'Booking: both parties confirmed service',
            `${booking.client.name} (hirer) and ${booking.musician.name} (musician) both confirmed completion for booking ${id.slice(0, 8)}…`,
            '/admin/bookings'
          );
        } else {
          const partialTitle =
            role === 'hirer' ? 'Hirer confirmed the service' : 'Musician confirmed rendering';
          const partialMessage =
            role === 'hirer'
              ? `${actorName} confirmed the service was completed. Please confirm on your side to finish the booking.`
              : `${actorName} confirmed the service was rendered. Please confirm on your side to finish the booking.`;
          await notificationsService.createNotification({
            user_id: targetUserId,
            type: 'booking',
            title: partialTitle,
            message: partialMessage,
            link: `/${recipientRole}/bookings`,
            is_read: false,
            priority: 'normal',
            data: { bookingId: id },
          });
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't throw here - service confirmation succeeded
      }
    } catch (err) {
      console.error('Error confirming service:', err);
      throw err;
    }
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        updateBooking,
        updatePaymentStatus,
        updatePayoutStatus,
        confirmService,
        refetch: fetchBookings,
        isLoading,
        error,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export default BookingProvider;
