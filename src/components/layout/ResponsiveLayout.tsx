import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout, MobileLayoutProps } from './MobileLayout';
import { DesktopLayout, DesktopLayoutProps } from './DesktopLayout';
import { cn } from '@/lib/utils';

export interface ResponsiveLayoutProps {
  /**
   * Content to render
   */
  children: React.ReactNode;
  /**
   * Mobile-specific layout props
   */
  mobileProps?: Omit<MobileLayoutProps, 'children'>;
  /**
   * Desktop-specific layout props
   */
  desktopProps?: Omit<DesktopLayoutProps, 'children'>;
  /**
   * Custom breakpoint override (uses useIsMobile hook by default)
   */
  forceMobile?: boolean;
  /**
   * Custom breakpoint override (uses useIsMobile hook by default)
   */
  forceDesktop?: boolean;
  /**
   * Additional CSS classes applied to both layouts
   */
  className?: string;
}

/**
 * ResponsiveLayout - Conditionally renders MobileLayout or DesktopLayout based on device type
 *
 * This component automatically detects the device type using the useIsMobile hook
 * and renders the appropriate layout wrapper.
 *
 * @example
 * ```tsx
 * <ResponsiveLayout
 *   mobileProps={{ padding: 'px-4 py-6' }}
 *   desktopProps={{ padding: 'px-8 py-10' }}
 * >
 *   <YourContent />
 * </ResponsiveLayout>
 * ```
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  mobileProps,
  desktopProps,
  forceMobile,
  forceDesktop,
  className,
}) => {
  const isMobile = useIsMobile();

  // Determine which layout to use
  const useMobile = forceMobile ?? (forceDesktop ? false : isMobile);

  if (useMobile) {
    return (
      <MobileLayout {...mobileProps} className={cn(mobileProps?.className, className)}>
        {children}
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout {...desktopProps} className={cn(desktopProps?.className, className)}>
      {children}
    </DesktopLayout>
  );
};
