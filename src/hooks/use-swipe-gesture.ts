import { useRef, useEffect, useState, useCallback } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger a swipe (default: 50)
  velocityThreshold?: number; // Minimum velocity to trigger a swipe (default: 0.3)
  preventScroll?: boolean; // Prevent default scroll behavior during swipe (default: false)
  enabled?: boolean; // Enable/disable swipe detection (default: true)
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
}

/**
 * Hook for detecting swipe gestures on touch devices
 * Supports left, right, up, and down swipes with configurable thresholds
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    enabled = true,
  } = options;

  const elementRef = useRef<HTMLElement | null>(null);
  const touchStateRef = useRef<TouchState | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;

      const touch = e.touches[0];
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
        isActive: true,
      };

      if (preventScroll) {
        e.preventDefault();
      }
    },
    [enabled, preventScroll]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStateRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (touchStateRef.current) {
        touchStateRef.current.currentX = touch.clientX;
        touchStateRef.current.currentY = touch.clientY;

        // Check if we've moved enough to consider it a swipe
        const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
        const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);

        if (deltaX > 10 || deltaY > 10) {
          setIsSwiping(true);
        }

        if (preventScroll) {
          e.preventDefault();
        }
      }
    },
    [enabled, preventScroll]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStateRef.current) {
        setIsSwiping(false);
        return;
      }

      const touchState = touchStateRef.current;
      const endTime = Date.now();
      const deltaX = touchState.currentX - touchState.startX;
      const deltaY = touchState.currentY - touchState.startY;
      const deltaTime = endTime - touchState.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Determine primary direction
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if swipe meets threshold and velocity requirements
      if (distance >= threshold && velocity >= velocityThreshold) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      touchStateRef.current = null;
      setIsSwiping(false);
    },
    [enabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  return {
    ref: elementRef,
    isSwiping,
  };
}
