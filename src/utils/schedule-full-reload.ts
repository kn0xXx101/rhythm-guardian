/**
 * Schedules a full browser reload after successful work (mutations, saves, payments).
 * Debounced so several quick successes still result in a single reload.
 */
let reloadTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleFullReload(delayMs = 500): void {
  if (typeof window === 'undefined') return;
  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    window.location.reload();
  }, delayMs);
}
