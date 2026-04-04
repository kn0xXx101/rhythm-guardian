import * as React from 'react';
import { RateLimitWarning } from './RateLimitWarning';
import { useToast } from '@/hooks/use-toast';

export interface RateLimitInfo {
  message?: string;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Hook to detect and handle rate limit errors
 */
export function useRateLimitHandler() {
  const { toast } = useToast();
  const [rateLimitInfo, setRateLimitInfo] = React.useState<RateLimitInfo | null>(null);

  const handleRateLimitError = React.useCallback(
    (error: any) => {
      // Check if error is a rate limit error
      const isRateLimitError =
        error?.status === 429 ||
        error?.code === '429' ||
        error?.message?.toLowerCase().includes('rate limit') ||
        error?.message?.toLowerCase().includes('too many requests');

      if (isRateLimitError) {
        const retryAfter = error?.retryAfter || error?.headers?.['retry-after'] || 60;
        const message = error?.message || 'Too many requests. Please wait before trying again.';

        setRateLimitInfo({
          message,
          retryAfter: typeof retryAfter === 'string' ? parseInt(retryAfter, 10) : retryAfter,
        });

        toast({
          title: 'Rate Limit Exceeded',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const clearRateLimit = React.useCallback(() => {
    setRateLimitInfo(null);
  }, []);

  return {
    rateLimitInfo,
    handleRateLimitError,
    clearRateLimit,
  };
}

/**
 * Component to display rate limit banner at top of page
 */
export function RateLimitBanner() {
  const { rateLimitInfo, clearRateLimit } = useRateLimitHandler();

  if (!rateLimitInfo) return null;

  return (
    <div className="sticky top-0 z-50 w-full">
      <RateLimitWarning
        message={rateLimitInfo.message}
        retryAfter={rateLimitInfo.retryAfter}
        onDismiss={clearRateLimit}
      />
    </div>
  );
}


