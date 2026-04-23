import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingContext } from '@/contexts/BookingContext';
import { notificationsService } from '@/services/notificationsService';
import type { AssistantUserRole } from '@/features/navigation-assistant/resolve-navigation-message';

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
  profile_completion_percentage: number | null;
  documents_submitted: boolean | null;
  documents_verified: boolean | null;
};

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
          .select('role, profile_completion_percentage, documents_submitted, documents_verified')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setProfileSignals(null);
          setProfileLoading(false);
          return;
        }
        setProfileSignals((data as any) ?? null);
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
            'status, payment_status, event_date, service_confirmed_by_hirer, service_confirmed_by_musician'
          )
          .eq(ownerColumn, user.id)
          .in('status', ['accepted', 'in_progress', 'pending']);
        if (cancelled) return;
        if (error) {
          setDbCountsLoading(false);
          return;
        }
        const now = Date.now();
        const isPastOrNow = (dateValue: string) => {
          const ts = new Date(dateValue).getTime();
          if (Number.isNaN(ts)) return false;
          return ts <= now;
        };
        const isFutureOrToday = (dateValue: string) => {
          const ts = new Date(dateValue).getTime();
          if (Number.isNaN(ts)) return false;
          return ts >= now - 24 * 60 * 60 * 1000;
        };
        const confirm = (data || []).filter((b: any) => {
          if (!(b.status === 'accepted' || b.status === 'in_progress')) return false;
          if (!isPastOrNow(b.event_date)) return false;
          return args.role === 'hirer' ? b.service_confirmed_by_hirer !== true : b.service_confirmed_by_musician !== true;
        }).length;
        const unpaid = (data || []).filter((b: any) => {
          if (b.payment_status !== 'pending') return false;
          if (!(b.status === 'accepted' || b.status === 'in_progress')) return false;
          return isFutureOrToday(b.event_date);
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
    const now = Date.now();
    const isFutureOrToday = (dateValue: string) => {
      const ts = new Date(dateValue).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= now - 24 * 60 * 60 * 1000;
    };
    const isPastOrNow = (dateValue: string) => {
      const ts = new Date(dateValue).getTime();
      if (Number.isNaN(ts)) return false;
      return ts <= now;
    };

    const paymentActionEligibleStatuses = new Set(['accepted', 'upcoming']);
    const confirmationEligibleStatuses = new Set(['accepted', 'upcoming']);

    const totalBookingsCount = bookings.length;
    const activeBookingsCount = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'upcoming'
    ).length;
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const derivedUnpaidBookingsCount = bookings.filter(
      (b) =>
        b.paymentStatus === 'unpaid' &&
        paymentActionEligibleStatuses.has(b.status) &&
        isFutureOrToday(b.date)
    ).length;

    const derivedNeedsServiceConfirmationCount = bookings.filter((b) => {
      if (!confirmationEligibleStatuses.has(b.status)) return false;
      if (!isPastOrNow(b.date)) return false;
      if (args.role === 'hirer') return b.serviceConfirmedByHirer !== true;
      return b.serviceConfirmedByMusician !== true;
    }).length;

    return {
      profileCompletion: profileSignals?.profile_completion_percentage ?? null,
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

