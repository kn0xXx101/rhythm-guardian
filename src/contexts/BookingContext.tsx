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
import { supabase, isGatewayOrTimeoutError } from '@/lib/supabase';
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
  /** Net amount after platform & payment fees (when set on booking row). */
  musicianPayout?: number;
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
  const fetchingRef = useRef(false);
  /** If another fetch was requested while one was in flight (e.g. SIGNED_IN), run again after. */
  const pendingFetchRef = useRef(false);

  const fetchBookings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (fetchingRef.current) {
      pendingFetchRef.current = true;
      return;
    }

    fetchingRef.current = true;

    try {
      if (!silent) setIsLoading(true);
      const data = await bookingService.getBookings();
      setBookings(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      const errorMessage =
        err?.message || err?.details || err?.hint || String(err ?? 'Unknown error');
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        console.log('Bookings table not yet created, showing empty state');
        setBookings([]);
        setError(null);
      } else if (errorMessage.includes('stack depth limit exceeded')) {
        console.error('Stack overflow detected in booking fetch, using fallback');
        setBookings([]);
        setError('Unable to load bookings due to system error. Please refresh the page.');
      } else if (isGatewayOrTimeoutError(err)) {
        setBookings([]);
        setError(
          'Could not load bookings: the server timed out or is temporarily unavailable. Please retry in a moment.'
        );
      } else {
        const short =
          errorMessage.length > 220 ? `${errorMessage.slice(0, 220)}…` : errorMessage;
        setError(`Failed to load bookings: ${short}`);
      }
    } finally {
      fetchingRef.current = false;
      if (!silent) setIsLoading(false);
      if (pendingFetchRef.current) {
        pendingFetchRef.current = false;
        void fetchBookings({ silent: true });
      }
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

  // Refetch when the session appears (e.g. after login); initial fetch can run before JWT is attached.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void fetchBookings();
      }
      if (event === 'SIGNED_OUT') {
        setBookings([]);
        setError(null);
      }
    });
    return () => subscription.unsubscribe();
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

      const { data: latestBooking } = await supabase
        .from('bookings')
        .select(
          'status,payment_status,payout_released,service_confirmed_at,service_confirmed_by_hirer,service_confirmed_by_musician'
        )
        .eq('id', id)
        .maybeSingle();

      // Determine if service will be fully confirmed after this update
      const willBeFullyConfirmed = Boolean(
        latestBooking
          ? latestBooking.service_confirmed_by_hirer && latestBooking.service_confirmed_by_musician
          : role === 'hirer'
            ? booking.serviceConfirmedByMusician
            : booking.serviceConfirmedByHirer
      );
      
      // Update local state
      const updates: Partial<Booking> =
        role === 'hirer' 
          ? { serviceConfirmedByHirer: true } 
          : { serviceConfirmedByMusician: true };
      
      // If both parties have now confirmed, mark as completed and release payout
      if (willBeFullyConfirmed) {
        updates.status = 'completed';
        updates.serviceConfirmedAt = latestBooking?.service_confirmed_at || new Date().toISOString();
        
        // Auto-release payout if payment has been received
        const payoutReleased = latestBooking?.payout_released === true;
        if (payoutReleased) {
          updates.payoutStatus = 'released';
        } else if (
          booking.paymentStatus === 'paid_to_admin' ||
          booking.paymentStatus === 'paid' ||
          booking.paymentStatus === 'service_completed'
        ) {
          updates.payoutStatus = 'pending';
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

      const actorName = role === 'hirer' ? booking.client.name : booking.musician.name;

      // In-app notifications for confirmations come from DB trigger create_booking_notification (single trigger after 00068).
      try {
        if (!willBeFullyConfirmed) {
          await notifyAdmins(
            'booking',
            role === 'hirer'
              ? 'Hirer confirmed service completion'
              : 'Musician confirmed service rendering',
            `${actorName} submitted a completion confirmation for booking ${id.slice(0, 8)}…. Waiting for the other party to confirm.`,
            '/admin/bookings',
            { eventKey: `booking-service-confirmed-partial:${id}:${role}` }
          );
        }
      } catch (notificationError) {
        console.error('Failed to notify admins:', notificationError);
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
