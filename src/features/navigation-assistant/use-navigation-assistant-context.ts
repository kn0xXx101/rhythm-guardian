import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingContext } from '@/contexts/BookingContext';
import type { AssistantUserRole } from '@/features/navigation-assistant/resolve-navigation-message';

export type NavigationAssistantSignals = {
  profileCompletion: number | null;
  documentsSubmitted: boolean | null;
  documentsVerified: boolean | null;

  pendingBookingsCount: number;
  unpaidBookingsCount: number;
  needsServiceConfirmationCount: number;
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

  const signals = useMemo<NavigationAssistantSignals>(() => {
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const unpaidBookingsCount = bookings.filter((b) => b.paymentStatus === 'unpaid').length;

    const needsServiceConfirmationCount = bookings.filter((b) => {
      if (!(b.status === 'upcoming' || b.status === 'accepted')) return false;
      if (args.role === 'hirer') return b.serviceConfirmedByHirer !== true;
      return b.serviceConfirmedByMusician !== true;
    }).length;

    return {
      profileCompletion: profileSignals?.profile_completion_percentage ?? null,
      documentsSubmitted: profileSignals?.documents_submitted ?? null,
      documentsVerified: profileSignals?.documents_verified ?? null,
      pendingBookingsCount,
      unpaidBookingsCount,
      needsServiceConfirmationCount,
    };
  }, [args.role, bookings, profileSignals]);

  const ready = Boolean(user?.id) && !bookingsLoading && !profileLoading;

  return {
    role: args.role,
    pathname: args.pathname,
    tourCompleted: args.tourCompleted,
    signals,
    ready,
  };
}

