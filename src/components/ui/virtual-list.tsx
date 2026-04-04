import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  scrollElement: HTMLElement | null;
  className?: string;
  itemClassName?: string;
  enableVirtualScrolling?: boolean;
  threshold?: number;
  emptyMessage?: React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 60,
  scrollElement,
  className,
  itemClassName,
  enableVirtualScrolling = true,
  threshold = 50,
  emptyMessage = 'No items found',
  getItemKey,
  overscan = 5,
}: VirtualListProps<T>) {
  const shouldVirtualize =
    enableVirtualScrolling && items.length > threshold && scrollElement !== null;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    enabled: shouldVirtualize,
  });

  // If virtual scrolling is disabled or items are below threshold, render normally
  if (!shouldVirtualize) {
    return (
      <div className={className}>
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => {
            const key = getItemKey ? getItemKey(item, index) : index;
            return (
              <div key={key} className={itemClassName}>
                {renderItem(item, index)}
              </div>
            );
          })
        )}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      className={className}
      style={{
        height: `${totalSize}px`,
        position: 'relative',
        width: '100%',
      }}
    >
      {items.length === 0 ? (
        <div
          className="flex items-center justify-center py-8 text-muted-foreground"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
        >
          {emptyMessage}
        </div>
      ) : (
        virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getItemKey ? getItemKey(item, virtualItem.index) : virtualItem.key;
          return (
            <div
              key={key}
              className={itemClassName}
              data-index={virtualItem.index}
              data-key={virtualItem.key}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })
      )}
    </div>
  );
}
