import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingContext } from '@/contexts/BookingContext';
import { notificationsService } from '@/services/notificationsService';
import { calculateProfileCompletion } from '@/lib/profile-completion';
import type { AssistantUserRole } from '@/features/navigation-assistant/resolve-navigation-message';
import {
  isBookingEventWindowPast,
  isWithinPostServiceConfirmationWindow,
} from '@/utils/booking-event-window';

export type NavigationAssistantSignals = {
  profileCompletion: number | null;
  documentsSubmitted: boolean | null;
  documentsVerified: boolean | null;

  totalBookingsCount: number;
  activeBookingsCount: number;
  pendingBookingsCount: number;
  unpaidBookingsCount: number;
  needsServiceConfirmationCount: number;
  unreadNotificationsCount: number;
};

export type NavigationAssistantContext = {
  role: AssistantUserRole;
  pathname: string;
  tourCompleted: boolean;
  signals: NavigationAssistantSignals;
  ready: boolean;
};

type ProfileSignalRow = {
  role: string | null;
  documents_submitted: boolean | null;
  documents_verified: boolean | null;
  completion: number | null;
};

function normalizeTimeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const timePart = value.includes('T') ? value.split('T')[1] ?? '' : value;
  const cleaned = timePart.replace('Z', '').split('+')[0] ?? '';
  const [hours, minutes] = cleaned.split(':');
  if (!hours || !minutes) return null;
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function composeBookingTime(start: string | null | undefined, end: string | null | undefined): string | null {
  const startNorm = normalizeTimeValue(start);
  const endNorm = normalizeTimeValue(end);
  if (startNorm && endNorm) return `${startNorm} - ${endNorm}`;
  return startNorm ?? null;
}

export function useNavigationAssistantContext(args: {
  role: AssistantUserRole;
  pathname: string;
  tourCompleted: boolean;
}): NavigationAssistantContext {
  const { user } = useAuth();
  const { bookings, isLoading: bookingsLoading } = useBookingContext();
  const [profileSignals, setProfileSignals] = useState<ProfileSignalRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [dbCounts, setDbCounts] = useState<{ unpaid: number; confirm: number }>({ unpaid: 0, confirm: 0 });
  const [dbCountsLoading, setDbCountsLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) {
        setProfileSignals(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            [
              'role',
              'full_name',
              'bio',
              'location',
              'phone',
              'avatar_url',
              'instruments',
              'genres',
              'hourly_rate',
              'available_days',
              'documents_submitted',
              'documents_verified',
            ].join(',')
          )
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setProfileSignals(null);
          setProfileLoading(false);
          return;
        }
        if (!data) {
          setProfileSignals(null);
          setProfileLoading(false);
          return;
        }
        const result = calculateProfileCompletion(data as any);
        setProfileSignals({
          role: (data as any).role ?? null,
          documents_submitted: (data as any).documents_submitted ?? null,
          documents_verified: (data as any).documents_verified ?? null,
          completion: result.percentage,
        });
        setProfileLoading(false);
      } catch {
        if (cancelled) return;
        setProfileSignals(null);
        setProfileLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) {
        setDbCounts({ unpaid: 0, confirm: 0 });
        setDbCountsLoading(false);
        return;
      }
      setDbCountsLoading(true);
      try {
        const ownerColumn = args.role === 'hirer' ? 'hirer_id' : 'musician_id';
        const { data, error } = await supabase
          .from('bookings')
          .select(
            'status, payment_status, event_date, duration_hours, start_time, end_time, service_confirmed_by_hirer, service_confirmed_by_musician'
          )
          .eq(ownerColumn, user.id)
          .in('status', ['accepted', 'in_progress', 'pending', 'expired']);
        if (cancelled) return;
        if (error) {
          setDbCountsLoading(false);
          return;
        }
        const confirm = (data || []).filter((b: any) => {
          const bookingTime = composeBookingTime(b.start_time, b.end_time);
          const eventEnded = isBookingEventWindowPast(
            b.event_date,
            typeof b.duration_hours === 'number' ? b.duration_hours : Number(b.duration_hours) || undefined,
            bookingTime
          );
          const withinConfirmWindow = isWithinPostServiceConfirmationWindow(
            b.event_date,
            typeof b.duration_hours === 'number' ? b.duration_hours : Number(b.duration_hours) || undefined,
            bookingTime
          );
          const isFunded = b.payment_status === 'paid';
          const canConfirm =
            b.status === 'in_progress' ||
            (b.status === 'accepted' && isFunded) ||
            (b.status === 'expired' && isFunded && withinConfirmWindow);
          if (!canConfirm || !eventEnded) return false;
          return args.role === 'hirer' ? b.service_confirmed_by_hirer !== true : b.service_confirmed_by_musician !== true;
        }).length;
        const unpaid = (data || []).filter((b: any) => {
          if (b.payment_status !== 'pending') return false;
          if (!(b.status === 'accepted' || b.status === 'in_progress')) return false;
          const bookingTime = composeBookingTime(b.start_time, b.end_time);
          return !isBookingEventWindowPast(
            b.event_date,
            typeof b.duration_hours === 'number' ? b.duration_hours : Number(b.duration_hours) || undefined,
            bookingTime
          );
        }).length;
        setDbCounts({ unpaid, confirm });
        setDbCountsLoading(false);
      } catch {
        if (cancelled) return;
        setDbCountsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [args.role, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) {
        setUnreadNotificationsCount(0);
        setNotificationsLoading(false);
        return;
      }
      setNotificationsLoading(true);
      try {
        const count = await notificationsService.getUnreadCount(user.id);
        if (cancelled) return;
        setUnreadNotificationsCount(count);
      } catch {
        if (cancelled) return;
        setUnreadNotificationsCount(0);
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signals = useMemo<NavigationAssistantSignals>(() => {
    const paymentActionEligibleStatuses = new Set(['accepted', 'upcoming']);
    const confirmationEligibleStatuses = new Set(['accepted', 'upcoming', 'expired']);

    const totalBookingsCount = bookings.length;
    const activeBookingsCount = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'upcoming'
    ).length;
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const derivedUnpaidBookingsCount = bookings.filter(
      (b) =>
        b.paymentStatus === 'unpaid' &&
        paymentActionEligibleStatuses.has(b.status) &&
        !isBookingEventWindowPast(b.date, b.durationHours, b.time)
    ).length;

    const derivedNeedsServiceConfirmationCount = bookings.filter((b) => {
      if (!confirmationEligibleStatuses.has(b.status)) return false;
      const eventEnded = isBookingEventWindowPast(b.date, b.durationHours, b.time);
      const withinConfirmWindow = isWithinPostServiceConfirmationWindow(
        b.date,
        b.durationHours,
        b.time
      );
      const isFunded = b.paymentStatus === 'paid_to_admin' || b.paymentStatus === 'paid';
      const canConfirm =
        b.status === 'upcoming' ||
        (b.status === 'accepted' && isFunded) ||
        (b.status === 'expired' && isFunded && withinConfirmWindow);
      if (!canConfirm || !eventEnded) return false;
      if (args.role === 'hirer') return b.serviceConfirmedByHirer !== true;
      return b.serviceConfirmedByMusician !== true;
    }).length;

    return {
      profileCompletion: profileSignals?.completion ?? null,
      documentsSubmitted: profileSignals?.documents_submitted ?? null,
      documentsVerified: profileSignals?.documents_verified ?? null,
      totalBookingsCount,
      activeBookingsCount,
      pendingBookingsCount,
      unpaidBookingsCount: dbCounts.unpaid > 0 ? dbCounts.unpaid : derivedUnpaidBookingsCount,
      needsServiceConfirmationCount:
        dbCounts.confirm > 0 ? dbCounts.confirm : derivedNeedsServiceConfirmationCount,
      unreadNotificationsCount,
    };
  }, [args.role, bookings, dbCounts.confirm, dbCounts.unpaid, profileSignals, unreadNotificationsCount]);

  const ready =
    Boolean(user?.id) &&
    !bookingsLoading &&
    !profileLoading &&
    !dbCountsLoading &&
    !notificationsLoading;

  return {
    role: args.role,
    pathname: args.pathname,
    tourCompleted: args.tourCompleted,
    signals,
    ready,
  };
}

