import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { Bell, BellOff } from 'lucide-react';

export interface NotificationPermissionPromptProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

/**
 * Component to request notification permission from the user
 * Can be used as a standalone prompt or integrated into settings
 */
export function NotificationPermissionPrompt({
  open: controlledOpen,
  onOpenChange,
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPermissionPromptProps) {
  const { permission, isSupported, requestPermission, isGranted } = useNotificationPermission();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        onPermissionGranted?.();
        setIsOpen(false);
      } else if (result === 'denied') {
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  // Don't show if not supported or already granted
  if (!isSupported || isGranted) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {permission === 'denied' ? (
              <>
                <BellOff className="h-5 w-5" />
                Notifications Disabled
              </>
            ) : (
              <>
                <Bell className="h-5 w-5" />
                Enable Notifications?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {permission === 'denied' ? (
              <>
                You've previously denied notification permissions. To enable notifications, please
                allow them in your browser settings and refresh the page.
              </>
            ) : (
              <>
                Stay updated with instant notifications about new messages, booking updates, and
                important events. You can change this anytime in your browser settings.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>
            {permission === 'denied' ? 'Close' : 'Not Now'}
          </AlertDialogCancel>
          {permission !== 'denied' && (
            <AlertDialogAction onClick={handleRequestPermission}>
              Enable Notifications
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to show notification permission prompt as a button trigger
 */
export function useNotificationPermissionPrompt() {
  const { permission, isSupported, isGranted, requestPermission } = useNotificationPermission();
  const [showPrompt, setShowPrompt] = React.useState(false);

  const trigger = () => {
    if (isGranted) {
      return;
    }
    if (permission === 'denied') {
      setShowPrompt(true);
    } else {
      requestPermission();
    }
  };

  return {
    trigger,
    showPrompt,
    setShowPrompt,
    isSupported,
    isGranted,
    permission,
  };
}


