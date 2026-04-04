import { useState, useEffect } from 'react';
import { actionQueue } from '@/lib/offline/queue';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [queuedActions, setQueuedActions] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync queued actions when back online
      syncQueuedActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue size periodically
    const checkQueue = async () => {
      try {
        const actions = await actionQueue.getAll();
        setQueuedActions(actions.length);
      } catch (error) {
        console.error('Error checking queue:', error);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
     
  }, []);

  const syncQueuedActions = async () => {
    if (!navigator.onLine) return;

    try {
      let action = await actionQueue.dequeue();
      while (action) {
        try {
          // Process the action (this would be implemented based on action type)
          // For now, we'll just log it
          console.log('Processing queued action:', action);

          // In a real implementation, you would:
          // - Call the appropriate API based on action.type
          // - Handle success/failure
          // - Retry on failure (respecting maxRetries)
          // - Remove from queue on success

          action = await actionQueue.dequeue();
        } catch (error) {
          console.error('Error processing queued action:', error);
          // Re-queue if retries haven't been exceeded
          if (action.retries < (action.maxRetries || 3)) {
            action.retries++;
            await actionQueue.enqueue(action);
          }
          break;
        }
      }

      // Update queue count
      const actions = await actionQueue.getAll();
      setQueuedActions(actions.length);
    } catch (error) {
      console.error('Error syncing queued actions:', error);
    }
  };

  return {
    isOnline,
    isOffline: !isOnline,
    queuedActions,
    syncQueuedActions,
  };
}

