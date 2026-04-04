import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface BottomNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: number;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
  /**
   * Show bottom nav only on mobile (default: true)
   */
  mobileOnly?: boolean;
}

/**
 * Bottom navigation bar component for mobile devices
 * Provides easy access to primary navigation items
 */
export function BottomNav({ items, className, mobileOnly = true }: BottomNavProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Don't render if mobileOnly is true and we're not on mobile
  if (mobileOnly && !isMobile) {
    return null;
  }

  const isActive = (item: BottomNavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'safe-area-inset-bottom', // Support for devices with notches/home indicators
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex max-w-screen-xl items-center justify-around px-2 py-1 md:px-4">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-3 py-2',
                'text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-b-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
