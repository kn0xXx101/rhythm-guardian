import * as React from 'react';
import { useVirtualScroll } from '@/hooks/use-virtual-scroll';
import { cn } from '@/lib/utils';

interface VirtualTableBodyProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  scrollElement: HTMLElement | null;
  className?: string;
  enableVirtualScrolling?: boolean;
  threshold?: number;
  emptyMessage?: string;
  getRowKey?: (item: T, index: number) => string | number;
}

export function VirtualTableBody<T>({
  items,
  renderRow,
  estimateSize = 60,
  scrollElement,
  className,
  enableVirtualScrolling = true,
  threshold = 50,
  emptyMessage = 'No items found',
  getRowKey,
}: VirtualTableBodyProps<T>) {
  const { virtualItems, totalSize, isVirtualized } = useVirtualScroll({
    count: items.length,
    scrollElement,
    estimateSize,
    enabled: enableVirtualScrolling && items.length > threshold,
  });

  // If virtual scrolling is disabled or items are below threshold, render normally
  if (!isVirtualized) {
    return (
      <tbody className={cn('[&_tr:last-child]:border-0', className)}>
        {items.length === 0 ? (
          <tr>
            <td colSpan={100} className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          items.map((item, index) => {
            const key = getRowKey ? getRowKey(item, index) : index;
            return <React.Fragment key={key}>{renderRow(item, index)}</React.Fragment>;
          })
        )}
      </tbody>
    );
  }

  // Virtual scrolling for large lists
  // For tables, we render only the visible rows (virtual scrolling still helps with performance)
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)}>
      {items.length === 0 ? (
        <tr>
          <td colSpan={100} className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </td>
        </tr>
      ) : virtualItems ? (
        virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getRowKey ? getRowKey(item, virtualItem.index) : virtualItem.key;
          return <React.Fragment key={key}>{renderRow(item, virtualItem.index)}</React.Fragment>;
        })
      ) : null}
    </tbody>
  );
}
