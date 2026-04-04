import { useVirtualizer } from '@tanstack/react-virtual';
import { RefObject, useMemo } from 'react';

interface UseVirtualScrollOptions {
  count: number;
  scrollElement: HTMLElement | null;
  estimateSize?: number;
  overscan?: number;
  enabled?: boolean;
}

export function useVirtualScroll({
  count,
  scrollElement,
  estimateSize = 60,
  overscan = 5,
  enabled = true,
}: UseVirtualScrollOptions) {
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    enabled: enabled && scrollElement !== null && count > 50,
  });

  const virtualItems = useMemo(() => {
    if (!enabled || !scrollElement || count <= 50) {
      return null;
    }
    return virtualizer.getVirtualItems();
  }, [enabled, scrollElement, count, virtualizer]);

  return {
    virtualItems,
    totalSize: virtualizer.getTotalSize(),
    isVirtualized: enabled && scrollElement !== null && count > 50,
  };
}
