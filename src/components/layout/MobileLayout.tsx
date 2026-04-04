import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MobileLayoutProps {
  /**
   * Content to render in the mobile layout
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Enable safe area insets for devices with notches/home indicators
   * @default true
   */
  enableSafeArea?: boolean;
  /**
   * Padding for the layout
   * @default 'px-4 py-4'
   */
  padding?: string;
  /**
   * Maximum width constraint (useful for preventing content from stretching too wide on tablets)
   */
  maxWidth?: string;
}

/**
 * MobileLayout - A wrapper component optimized for mobile device layouts
 *
 * Features:
 * - Safe area inset support for devices with notches/home indicators
 * - Optimized padding and spacing
 * - Touch-friendly spacing
 * - Prevents horizontal overflow
 *
 * @example
 * ```tsx
 * <MobileLayout>
 *   <YourContent />
 * </MobileLayout>
 * ```
 */
export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className,
  enableSafeArea = true,
  padding = 'px-4 py-4',
  maxWidth,
}) => {
  return (
    <div
      className={cn(
        'w-full',
        'min-h-screen',
        'bg-background',
        // Prevent horizontal overflow
        'overflow-x-hidden',
        // Touch-friendly spacing
        padding,
        // Safe area support
        enableSafeArea && 'safe-area-inset-top safe-area-inset-bottom',
        // Max width constraint
        maxWidth && maxWidth,
        className
      )}
    >
      {children}
    </div>
  );
};
