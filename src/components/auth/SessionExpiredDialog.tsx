import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SessionManager } from '@/utils/session-manager';

export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for session errors globally
    const handleSessionError = (event: CustomEvent) => {
      const errorInfo = SessionManager.handleSessionError(event.detail);
      
      if (errorInfo.shouldRedirectToLogin) {
        setOpen(true);
      }
    };

    window.addEventListener('session-error' as any, handleSessionError);

    return () => {
      window.removeEventListener('session-error' as any, handleSessionError);
    };
  }, []);

  const handleLogin = () => {
    setOpen(false);
    navigate('/login', { state: { from: window.location.pathname } });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired for security reasons. Please log in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleLogin}>
            Go to Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
