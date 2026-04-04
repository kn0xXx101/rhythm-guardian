import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /**
   * Optional message to display below the spinner
   */
  message?: string;
  /**
   * Optional secondary message/subtitle
   */
  subtitle?: string;
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom className
   */
  className?: string;
  /**
   * Whether to show as a full screen overlay
   */
  fullScreen?: boolean;
  /**
   * Whether to show a backdrop
   */
  withBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

const sizeTextClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * LoadingSpinner component with optional message
 * Use this component for consistent loading states across the app
 */
export function LoadingSpinner({
  message,
  subtitle,
  size = 'md',
  className,
  fullScreen = false,
  withBackdrop = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-primary/10 rounded-full',
            sizeClasses[size]
          )}
        />
      </div>
      {message && (
        <div className="text-center space-y-1">
          <p className={cn('font-medium text-foreground', sizeTextClasses[size])}>{message}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 flex items-center justify-center z-50',
          withBackdrop && 'bg-background/80 backdrop-blur-sm'
        )}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Inline loading spinner (small, for buttons or inline content)
 */
export function InlineSpinner({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  return <Loader2 className={cn('animate-spin text-current', sizeClasses[size], className)} />;
}

/**
 * Loading overlay for sections
 */
export function LoadingOverlay({
  message,
  subtitle,
  size = 'md',
}: {
  message?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-md">
      <LoadingSpinner message={message} subtitle={subtitle} size={size} />
    </div>
  );
}
