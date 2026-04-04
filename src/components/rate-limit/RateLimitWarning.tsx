import * as React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RateLimitWarningProps {
  message?: string;
  retryAfter?: number; // seconds until retry is allowed
  onDismiss?: () => void;
  className?: string;
}

export function RateLimitWarning({
  message = 'Too many requests. Please slow down.',
  retryAfter,
  onDismiss,
  className,
}: RateLimitWarningProps) {
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(
    retryAfter || null
  );

  React.useEffect(() => {
    if (!timeRemaining || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <Alert variant="destructive" className={cn('relative', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {timeRemaining !== null && timeRemaining > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Retry in {formatTime(timeRemaining)}</span>
          </div>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="absolute top-2 right-2 h-6 w-6 p-0"
          >
            ×
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}


