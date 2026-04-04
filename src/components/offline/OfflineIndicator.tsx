import { useOffline } from '@/hooks/use-offline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const { isOffline, queuedActions, syncQueuedActions } = useOffline();

  if (!isOffline && queuedActions === 0) {
    return null;
  }

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      {isOffline ? (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">You&apos;re offline</AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Your changes will be saved and synced when you&apos;re back online.
          </AlertDescription>
        </Alert>
      ) : queuedActions > 0 ? (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <Wifi className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Syncing changes</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 flex items-center justify-between">
            <span>{queuedActions} action{queuedActions !== 1 ? 's' : ''} pending</span>
            <button
              onClick={syncQueuedActions}
              className="text-xs underline hover:no-underline"
            >
              Sync now
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

