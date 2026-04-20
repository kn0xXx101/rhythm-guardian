import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingContext } from '@/contexts/BookingContext';
import { notificationsService } from '@/services/notificationsService';
import { useToast } from '@/hooks/use-toast';
import {
  getBookingEventEndMs,
  isWithinPostServiceConfirmationWindow,
} from '@/utils/booking-event-window';

type ReminderMinutes = 60 | 15;

const REMINDER_THRESHOLDS_MINUTES: ReminderMinutes[] = [60, 15];
const REMINDER_WINDOW_MINUTES = 5; // fire within 5-min window
const CONFIRM_REMINDERS_MINUTES_AFTER_END = [5, 120, 1440] as const; // 5m, 2h, 24h after end

function getLocalKey(userId: string, bookingId: string, minutes: number) {
  return `booking-reminder:${userId}:${bookingId}:${minutes}`;
}

function formatMinutesLabel(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minutes`;
}

export function useBookingReminders(userType: 'hirer' | 'musician') {
  const { user } = useAuth();
  const { bookings } = useBookingContext();
  const { toast } = useToast();
  const isRunningRef = useRef(false);
  const prefsLoadedRef = useRef(false);
  const inAppBookingsEnabledRef = useRef(true);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    const loadPrefs = async () => {
      try {
        const prefs = await notificationsService.getPreferences(userId);
        inAppBookingsEnabledRef.current = prefs.in_app_bookings !== false;
      } catch {
        // If prefs can't load, default to enabled.
        inAppBookingsEnabledRef.current = true;
      } finally {
        prefsLoadedRef.current = true;
      }
    };

    if (!prefsLoadedRef.current) void loadPrefs();

    const tick = async () => {
      if (cancelled) return;
      if (isRunningRef.current) return;
      if (!prefsLoadedRef.current) return;
      if (!inAppBookingsEnabledRef.current) return;
      if (!userId) return;

      isRunningRef.current = true;
      try {
        const now = Date.now();
        const upcomingRelevant = (bookings || []).filter((b) => {
          const belongs =
            userType === 'hirer' ? b?.client?.id === userId : b?.musician?.id === userId;
          if (!belongs) return false;
          if (b?.status !== 'upcoming' && b?.status !== 'accepted') return false;
          if (!b?.date) return false;
          const start = new Date(b.date).getTime();
          if (!Number.isFinite(start)) return false;
          return start > now;
        });

        for (const booking of upcomingRelevant) {
          const startMs = new Date(booking.date).getTime();
          const minutesUntil = Math.floor((startMs - now) / 60000);

          for (const threshold of REMINDER_THRESHOLDS_MINUTES) {
            if (minutesUntil > threshold) continue;
            if (minutesUntil <= threshold - REMINDER_WINDOW_MINUTES) continue;

            const key = getLocalKey(userId, booking.id, threshold);
            if (localStorage.getItem(key) === '1') continue;

            const otherPartyName =
              userType === 'hirer' ? booking.musician?.name || 'Musician' : booking.client?.name || 'Hirer';

            const link = userType === 'hirer' ? '/hirer/bookings' : '/musician/bookings';
            const timeLabel = formatMinutesLabel(threshold);

            try {
              await notificationsService.createNotification({
                user_id: userId,
                type: 'booking',
                title: `Service starts in ${timeLabel}`,
                message: `Upcoming booking with ${otherPartyName}. Location: ${booking.location || 'TBD'}.`,
                link,
                is_read: false,
                priority: threshold <= 15 ? 'high' : 'normal',
                data: {
                  booking_id: booking.id,
                  threshold_minutes: threshold,
                  event_date: booking.date,
                },
              });
            } catch {
              // Ignore notification insertion failures; still avoid spamming the user in this session.
            }

            toast({
              title: `Reminder: ${timeLabel} to go`,
              description: `Booking with ${otherPartyName} is about to start.`,
            });

            localStorage.setItem(key, '1');
          }
        }

        // Post-service confirmation reminders: once the scheduled end time passes, prompt BOTH parties
        // (each user will see reminders in their own session) to confirm completion/rendering.
        const confirmRelevant = (bookings || []).filter((b) => {
          const belongs =
            userType === 'hirer' ? b?.client?.id === userId : b?.musician?.id === userId;
          if (!belongs) return false;
          if (!b?.date) return false;
          // Only remind if within grace window after end time.
          if (!isWithinPostServiceConfirmationWindow(b.date, b.durationHours)) return false;
          const hasConfirmed =
            userType === 'hirer' ? Boolean(b.serviceConfirmedByHirer) : Boolean(b.serviceConfirmedByMusician);
          // If this user already confirmed, no need to remind.
          if (hasConfirmed) return false;
          return true;
        });

        for (const booking of confirmRelevant) {
          const endMs = getBookingEventEndMs(booking.date, booking.durationHours);
          if (endMs == null) continue;
          const minutesAfterEnd = Math.floor((now - endMs) / 60000);
          if (minutesAfterEnd < 0) continue;

          const otherPartyName =
            userType === 'hirer'
              ? booking.musician?.name || 'Musician'
              : booking.client?.name || 'Hirer';
          const link = userType === 'hirer' ? '/hirer/bookings' : '/musician/bookings';
          const actionLabel = userType === 'hirer' ? 'Complete Service' : 'Confirm Rendering';

          for (const threshold of CONFIRM_REMINDERS_MINUTES_AFTER_END) {
            if (minutesAfterEnd < threshold) continue;
            if (minutesAfterEnd > threshold + REMINDER_WINDOW_MINUTES) continue;

            const key = getLocalKey(userId, booking.id, 10_000 + threshold);
            if (localStorage.getItem(key) === '1') continue;

            try {
              await notificationsService.createNotification({
                user_id: userId,
                type: 'booking',
                title: actionLabel,
                message: `Your booking with ${otherPartyName} has ended. Tap “${actionLabel}” to confirm and finalize.`,
                link,
                is_read: false,
                priority: threshold <= 120 ? 'high' : 'normal',
                data: {
                  booking_id: booking.id,
                  remind_type: 'post_service_confirm',
                  minutes_after_end: threshold,
                  event_date: booking.date,
                },
              });
            } catch {
              // ignore
            }

            toast({
              title: actionLabel,
              description: `Booking with ${otherPartyName} ended. Tap “${actionLabel}” to finalize.`,
            });

            localStorage.setItem(key, '1');
          }
        }
      } finally {
        isRunningRef.current = false;
      }
    };

    // Initial tick and then every minute.
    void tick();
    const interval = setInterval(() => void tick(), 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bookings, toast, user?.id, userType]);
}

