function parseDateParts(eventDateIso: string): { year: number; monthIndex: number; day: number } | null {
  const directDateMatch = eventDateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (directDateMatch) {
    return {
      year: Number(directDateMatch[1]),
      monthIndex: Number(directDateMatch[2]) - 1,
      day: Number(directDateMatch[3]),
    };
  }

  const parsed = new Date(eventDateIso);
  if (isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

function parseHourMinuteFromBookingTime(bookingTime?: string | null): { hour: number; minute: number } | null {
  if (!bookingTime) return null;

  // Supports common formats such as:
  // - "18:30"
  // - "18:30 - 20:30"
  // - "6:30 PM - 8:30 PM"
  const match = bookingTime.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return { hour, minute };
}

function getBookingEventStartMs(
  eventDateIso: string | undefined | null,
  bookingTime?: string | null
): number | null {
  if (!eventDateIso) return null;

  const dateParts = parseDateParts(eventDateIso);
  if (!dateParts) return null;

  const timeParts = parseHourMinuteFromBookingTime(bookingTime);
  if (timeParts) {
    return new Date(
      dateParts.year,
      dateParts.monthIndex,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      0,
      0
    ).getTime();
  }

  const parsed = new Date(eventDateIso);
  if (isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

/**
 * Event window uses start (event_date [+ optional booking time]) + duration.
 * Defaults to 1h if duration missing.
 */
export function getBookingEventEndMs(
  eventDateIso: string | undefined | null,
  durationHours?: number | null,
  bookingTime?: string | null
): number | null {
  const startMs = getBookingEventStartMs(eventDateIso, bookingTime);
  if (startMs == null) return null;
  const hours = typeof durationHours === 'number' && durationHours > 0 ? durationHours : 1;
  return startMs + hours * 60 * 60 * 1000;
}

/** True if the scheduled event end is strictly before now (payment / active booking should not apply). */
export function isBookingEventWindowPast(
  eventDateIso: string | undefined | null,
  durationHours?: number | null,
  bookingTime?: string | null
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours, bookingTime);
  if (endMs == null) return false;
  return endMs < Date.now();
}

/**
 * True when the scheduled event has ended, but we are still within the grace period during which
 * both parties should confirm service completion. Use this to show "Confirm Rendering / Complete Service"
 * instead of "Refund" immediately after end time.
 */
export function isWithinPostServiceConfirmationWindow(
  eventDateIso: string | undefined | null,
  durationHours?: number | null,
  bookingTime?: string | null,
  graceHours: number = 48
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours, bookingTime);
  if (endMs == null) return false;
  const now = Date.now();
  if (now < endMs) return false;
  const graceMs = Math.max(0, graceHours) * 60 * 60 * 1000;
  return now <= endMs + graceMs;
}

/** True when the grace window has passed (refund/cancellation escalation can apply). */
export function isPostServiceConfirmationWindowExpired(
  eventDateIso: string | undefined | null,
  durationHours?: number | null,
  bookingTime?: string | null,
  graceHours: number = 48
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours, bookingTime);
  if (endMs == null) return false;
  const graceMs = Math.max(0, graceHours) * 60 * 60 * 1000;
  return Date.now() > endMs + graceMs;
}
