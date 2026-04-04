import { useState, useEffect, useCallback } from 'react';

export type NotificationPermissionStatus = NotificationPermission | 'unsupported';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const [isSupported, setIsSupported] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window;
  });

  useEffect(() => {
    if (!isSupported) return;

    const checkPermission = () => {
      setPermission(Notification.permission);
    };

    // Listen for permission changes (some browsers support this)
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          setPermission(status.state as NotificationPermission);
          status.onchange = () => {
            setPermission(status.state as NotificationPermission);
          };
        })
        .catch(() => {
          // Fallback to checking Notification.permission directly
          checkPermission();
        });
    } else {
      checkPermission();
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported in this browser');
    }

    if (permission === 'granted') {
      return permission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    requestPermission,
  };
}


