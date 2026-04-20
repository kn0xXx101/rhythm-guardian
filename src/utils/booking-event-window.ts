/**
 * Event window uses start (event_date) + duration. Defaults to 1h if duration missing.
 */
export function getBookingEventEndMs(
  eventDateIso: string | undefined | null,
  durationHours?: number | null
): number | null {
  if (!eventDateIso) return null;
  const start = new Date(eventDateIso);
  if (isNaN(start.getTime())) return null;
  const hours = typeof durationHours === 'number' && durationHours > 0 ? durationHours : 1;
  return start.getTime() + hours * 60 * 60 * 1000;
}

/** True if the scheduled event end is strictly before now (payment / active booking should not apply). */
export function isBookingEventWindowPast(
  eventDateIso: string | undefined | null,
  durationHours?: number | null
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours);
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
  graceHours: number = 48
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours);
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
  graceHours: number = 48
): boolean {
  const endMs = getBookingEventEndMs(eventDateIso, durationHours);
  if (endMs == null) return false;
  const graceMs = Math.max(0, graceHours) * 60 * 60 * 1000;
  return Date.now() > endMs + graceMs;
}
