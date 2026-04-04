import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DesktopLayoutProps {
  /**
   * Content to render in the desktop layout
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Container width constraint
   * @default 'container mx-auto'
   */
  container?: string;
  /**
   * Padding for the layout
   * @default 'px-6 py-8'
   */
  padding?: string;
  /**
   * Maximum width of the container
   */
  maxWidth?: string;
  /**
   * Enable centered layout
   * @default true
   */
  centered?: boolean;
}

/**
 * DesktopLayout - A wrapper component optimized for desktop layouts
 *
 * Features:
 * - Centered container with max-width constraints
 * - Optimized padding and spacing for larger screens
 * - Support for wide-screen layouts
 *
 * @example
 * ```tsx
 * <DesktopLayout>
 *   <YourContent />
 * </DesktopLayout>
 * ```
 */
export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  className,
  container = 'container mx-auto',
  padding = 'px-6 py-8',
  maxWidth,
  centered = true,
}) => {
  return (
    <div
      className={cn(
        'w-full',
        'min-h-screen',
        'bg-background',
        container,
        padding,
        centered && 'mx-auto',
        maxWidth && maxWidth,
        className
      )}
    >
      {children}
    </div>
  );
};
