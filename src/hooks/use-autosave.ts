import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface AutosaveOptions<T> {
  data: T;
  storageKey: string;
  interval?: number;
  onSave?: (data: T) => void | Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook to automatically save form data to localStorage
 * @param options Autosave configuration
 * @returns Object with save, load, clear functions and status
 */
export function useAutosave<T>(options: AutosaveOptions<T>) {
  const {
    data,
    storageKey,
    interval = 30000, // 30 seconds default
    onSave,
    enabled = true,
    debounceMs = 1000,
  } = options;

  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  // Load data from localStorage
  const load = (): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error('Error loading autosave data:', error);
    }
    return null;
  };

  // Clear saved data
  const clear = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing autosave data:', error);
    }
  };

  // Save data to localStorage
  const save = async (dataToSave?: T) => {
    if (isSavingRef.current) return;

    const dataToStore = dataToSave ?? data;
    const dataString = JSON.stringify(dataToStore);

    // Skip if data hasn't changed
    if (dataString === lastSavedRef.current) return;

    isSavingRef.current = true;

    try {
      // Call optional onSave callback
      if (onSave) {
        await onSave(dataToStore);
      }

      // Save to localStorage
      localStorage.setItem(storageKey, dataString);
      lastSavedRef.current = dataString;

      return true;
    } catch (error) {
      console.error('Error saving autosave data:', error);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Debounced save function
  const saveDebounced = (dataToSave?: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      save(dataToSave);
    }, debounceMs);
  };

  // Set up interval-based autosave
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, storageKey]);

  // Save on data change (debounced)
  useEffect(() => {
    if (!enabled) return;

    saveDebounced();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [data, enabled, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    save,
    load,
    clear,
    hasDraft: () => {
      try {
        return localStorage.getItem(storageKey) !== null;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Hook for autosave with toast notifications
 */
export function useAutosaveWithToast<T>(options: AutosaveOptions<T>) {
  const autosave = useAutosave(options);
  const { toast } = useToast();

  const saveWithToast = async (dataToSave?: T) => {
    const success = await autosave.save(dataToSave);
    if (success) {
      toast({
        title: 'Draft saved',
        description: 'Your changes have been saved automatically.',
        duration: 2000,
      });
    }
    return success;
  };

  return {
    ...autosave,
    save: saveWithToast,
  };
}
