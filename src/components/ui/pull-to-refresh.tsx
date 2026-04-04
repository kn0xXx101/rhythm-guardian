import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number; // Distance in pixels to trigger refresh (default: 80)
  children: React.ReactNode;
  className?: string;
}

/**
 * Pull-to-refresh component for mobile devices
 * Provides a native-like pull-to-refresh experience
 */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  threshold = 80,
  children,
  className,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const touchStartRef = React.useRef<number | null>(null);
  const scrollTopRef = React.useRef<number>(0);
  const isPullingRef = React.useRef(false);

  const handleTouchStart = React.useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      scrollTopRef.current = container.scrollTop;

      // Only allow pull-to-refresh if we're at the top of the container
      if (scrollTopRef.current <= 0) {
        touchStartRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = React.useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || !isPullingRef.current || touchStartRef.current === null)
        return;

      const container = containerRef.current;
      if (!container) return;

      const touchY = e.touches[0].clientY;
      const pullY = touchY - touchStartRef.current;

      // Only allow downward pull
      if (pullY > 0 && scrollTopRef.current <= 0) {
        // Add resistance effect (cubic easing)
        const resistance = 0.5;
        const pullDistance = pullY * resistance;
        setPullDistance(pullDistance);

        // Prevent default scrolling when pulling down
        if (pullDistance > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        isPullingRef.current = false;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchEnd = React.useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= threshold && isPullingRef.current) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        // Animate back to top
        setPullDistance(0);
        setTimeout(() => {
          setIsRefreshing(false);
          isPullingRef.current = false;
          touchStartRef.current = null;
        }, 300);
      }
    } else {
      // Spring back
      setPullDistance(0);
      isPullingRef.current = false;
      touchStartRef.current = null;
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate opacity and rotation for the refresh indicator
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{
        transform: shouldShowIndicator
          ? `translateY(${Math.min(pullDistance, threshold)}px)`
          : undefined,
        transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Pull-to-refresh indicator */}
      {shouldShowIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-10"
          style={{
            transform: `translateY(${-100 + pullDistance * 0.5}%)`,
            opacity: progress,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {isRefreshing ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Refreshing...</span>
              </>
            ) : (
              <>
                <Loader2
                  className="h-6 w-6 text-primary"
                  style={{
                    transform: `rotate(${progress * 360}deg)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
