import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

/**
 * Component to check if user is suspended and redirect them
 * Place this in App.tsx to run on every route
 */
export function SuspensionCheck() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Skip check for public routes
    const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy'];
    if (publicRoutes.includes(location.pathname)) {
      return;
    }

    // Check if user is suspended or banned
    if (user && (user.status === 'suspended' || user.status === 'banned')) {
      const message = user.status === 'suspended' 
        ? 'Your account has been suspended. Please contact support for more information.'
        : 'Your account has been banned. Please contact support for more information.';
      
      toast({
        variant: 'destructive',
        title: 'Account ' + (user.status === 'suspended' ? 'Suspended' : 'Banned'),
        description: message,
        duration: 10000,
      });

      // Log them out and redirect to login
      logout();
      navigate('/login', { replace: true });
    }
  }, [user, location.pathname, logout, navigate, toast]);

  return null; // This component doesn't render anything
}
