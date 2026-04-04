import * as React from 'react';
import { Card, CardProps } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SwipeableCardProps extends CardProps {
  /**
   * Action buttons to show when swiped left
   */
  leftActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'secondary';
  }>;
  /**
   * Action buttons to show when swiped right
   */
  rightActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'secondary';
  }>;
  /**
   * Callback when card is swiped left
   */
  onSwipeLeft?: () => void;
  /**
   * Callback when card is swiped right
   */
  onSwipeRight?: () => void;
  /**
   * Enable swipe gestures (default: true)
   */
  enableSwipe?: boolean;
  /**
   * Card content
   */
  children: React.ReactNode;
}

/**
 * Card component with swipe gesture support for mobile
 * Reveals action buttons when swiped left or right
 */
export function SwipeableCard({
  leftActions,
  rightActions,
  onSwipeLeft,
  onSwipeRight,
  enableSwipe = true,
  children,
  className,
  ...cardProps
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const touchStartRef = React.useRef<number | null>(null);
  const isAnimatingRef = React.useRef(false);

  const handleSwipeLeft = React.useCallback(() => {
    if (isAnimatingRef.current) return;

    if (leftActions && leftActions.length > 0) {
      setSwipeOffset(-80);
    }
    onSwipeLeft?.();
  }, [leftActions, onSwipeLeft]);

  const handleSwipeRight = React.useCallback(() => {
    if (isAnimatingRef.current) return;

    if (rightActions && rightActions.length > 0) {
      setSwipeOffset(80);
    }
    onSwipeRight?.();
  }, [rightActions, onSwipeRight]);

  // Handle touch events for visual feedback
  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe) return;
      touchStartRef.current = e.touches[0].clientX;
      setIsSwiping(true);
    },
    [enableSwipe]
  );

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe || touchStartRef.current === null) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - touchStartRef.current;

      // Only allow swiping if there are actions on that side
      if (deltaX < 0 && leftActions && leftActions.length > 0) {
        setSwipeOffset(Math.max(deltaX, -80));
      } else if (deltaX > 0 && rightActions && rightActions.length > 0) {
        setSwipeOffset(Math.min(deltaX, 80));
      }
    },
    [enableSwipe, leftActions, rightActions]
  );

  const handleTouchEnd = React.useCallback(() => {
    if (!enableSwipe) return;

    setIsSwiping(false);
    const currentOffset = swipeOffset;
    touchStartRef.current = null;

    // Snap to action area or reset
    if (currentOffset < -40 && leftActions && leftActions.length > 0) {
      setSwipeOffset(-80);
      onSwipeLeft?.();
    } else if (currentOffset > 40 && rightActions && rightActions.length > 0) {
      setSwipeOffset(80);
      onSwipeRight?.();
    } else {
      setSwipeOffset(0);
    }
  }, [enableSwipe, swipeOffset, leftActions, rightActions, onSwipeLeft, onSwipeRight]);

  const resetPosition = React.useCallback(() => {
    isAnimatingRef.current = true;
    setSwipeOffset(0);
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 300);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action buttons */}
      {(leftActions || rightActions) && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
          {/* Left actions */}
          {leftActions && leftActions.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 pr-4 transition-opacity duration-200',
                swipeOffset < -40 ? 'opacity-100' : 'opacity-0'
              )}
            >
              {leftActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'destructive'}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    resetPosition();
                  }}
                  className="pointer-events-auto"
                  aria-label={action.label}
                >
                  {action.icon || <Trash2 className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          )}

          {/* Right actions */}
          {rightActions && rightActions.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 pl-4 ml-auto transition-opacity duration-200',
                swipeOffset > 40 ? 'opacity-100' : 'opacity-0'
              )}
            >
              {rightActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    resetPosition();
                  }}
                  className="pointer-events-auto"
                  aria-label={action.label}
                >
                  {action.icon || <Edit className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card */}
      <Card
        ref={cardRef}
        className={cn(
          'relative transition-transform duration-300 ease-out',
          isSwiping && 'transition-none',
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...cardProps}
      >
        {children}
      </Card>
    </div>
  );
}
