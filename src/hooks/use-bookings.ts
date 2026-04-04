import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { bookingService } from '@/services/booking';
import { queryKeys } from '@/lib/query-keys';
import type { Booking, BookingStatus, PaymentStatus } from '@/contexts/BookingContext';

/**
 * React Query hook for fetching bookings with caching and automatic refetching
 */
export function useBookings(filters?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.bookings.list(filters),
    queryFn: () => bookingService.getBookings(),
    staleTime: 1000 * 30, // 30 seconds - bookings change frequently
  });
}

/**
 * React Query hook for fetching a single booking by ID
 */
export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: async () => {
      const bookings = await bookingService.getBookings();
      return bookings.find((b) => b.id === id);
    },
    enabled: !!id,
  });
}

/**
 * React Query hook for creating a booking with optimistic update
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booking: Omit<Booking, 'id'>) => bookingService.createBooking(booking),
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.bookings.all });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData<Booking[]>(queryKeys.bookings.list());

      // Optimistically update with a temporary ID
      const optimisticBooking: Booking = {
        ...newBooking,
        id: `temp-${Date.now()}`,
      };

      queryClient.setQueryData<Booking[]>(queryKeys.bookings.list(), (old = []) => [
        optimisticBooking,
        ...old,
      ]);

      return { previousBookings };
    },
    onError: (_err, _newBooking, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKeys.bookings.list(), context.previousBookings);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch bookings after successful creation
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

/**
 * React Query hook for updating a booking with optimistic update
 */
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Booking> }) =>
      bookingService.updateBooking(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookings.all });

      const previousBookings = queryClient.getQueryData<Booking[]>(queryKeys.bookings.list());
      const previousBooking = queryClient.getQueryData<Booking>(queryKeys.bookings.detail(id));

      // Optimistically update
      queryClient.setQueryData<Booking[]>(queryKeys.bookings.list(), (old = []) =>
        old.map((booking) => (booking.id === id ? { ...booking, ...updates } : booking))
      );

      if (previousBooking) {
        queryClient.setQueryData<Booking>(queryKeys.bookings.detail(id), {
          ...previousBooking,
          ...updates,
        });
      }

      return { previousBookings, previousBooking };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKeys.bookings.list(), context.previousBookings);
      }
      if (context?.previousBooking) {
        queryClient.setQueryData(queryKeys.bookings.detail(id), context.previousBooking);
      }
    },
    onSuccess: (_data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

/**
 * React Query hook for updating payment status with optimistic update
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
      bookingService.updatePaymentStatus(id, paymentStatus),
    onMutate: async ({ id, paymentStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookings.all });

      const previousBookings = queryClient.getQueryData<Booking[]>(queryKeys.bookings.list());
      const previousBooking = queryClient.getQueryData<Booking>(queryKeys.bookings.detail(id));

      // Optimistically update
      queryClient.setQueryData<Booking[]>(queryKeys.bookings.list(), (old = []) =>
        old.map((booking) => (booking.id === id ? { ...booking, paymentStatus } : booking))
      );

      if (previousBooking) {
        queryClient.setQueryData<Booking>(queryKeys.bookings.detail(id), {
          ...previousBooking,
          paymentStatus,
        });
      }

      return { previousBookings, previousBooking };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKeys.bookings.list(), context.previousBookings);
      }
      if (context?.previousBooking) {
        queryClient.setQueryData(queryKeys.bookings.detail(id), context.previousBooking);
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

/**
 * Infinite query hook for paginated bookings
 */
export function useBookingsInfinite(filters?: { userId?: string; status?: string }) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookings.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const allBookings = await bookingService.getBookings();
      const pageSize = 20;
      const start = pageParam * pageSize;
      const end = start + pageSize;
      return {
        data: allBookings.slice(start, end),
        nextCursor: end < allBookings.length ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
