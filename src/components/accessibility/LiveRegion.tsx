import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  /**
   * The message to announce to screen readers
   */
  message: string;

  /**
   * The politeness level for the announcement
   * - 'polite': Waits for a natural pause (default)
   * - 'assertive': Interrupts immediately
   */
  politeness?: 'polite' | 'assertive';

  /**
   * Optional ID for the live region element
   */
  id?: string;
}

/**
 * LiveRegion component for screen reader announcements
 *
 * This component creates an aria-live region that announces dynamic content
 * changes to screen reader users. It's visually hidden but accessible to assistive technologies.
 *
 * Usage:
 * ```tsx
 * <LiveRegion message="New notification received" politeness="polite" />
 * ```
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  id = 'live-region',
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // Clear previous message to ensure announcement
      regionRef.current.textContent = '';
      // Use setTimeout to ensure the clear happens before the new message
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={regionRef}
      id={id}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      aria-relevant="additions text"
    />
  );
}

/**
 * Hook to manage live region announcements
 *
 * Usage:
 * ```tsx
 * const announce = useLiveRegion();
 * announce('Data refreshed successfully', 'polite');
 * ```
 */
export function useLiveRegion() {
  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    // Find or create live region
    let liveRegion = document.getElementById('app-live-region');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'app-live-region';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-relevant', 'additions text');
      document.body.appendChild(liveRegion);
    }

    // Update politeness if needed
    liveRegion.setAttribute('aria-live', politeness);

    // Clear and set message to trigger announcement
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);
  };

  return announce;
}
