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
