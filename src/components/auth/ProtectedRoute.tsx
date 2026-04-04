import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'hirer' | 'musician';
  userType?: 'hirer' | 'musician';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  userType,
}) => {
  const { user, userRole, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to admin login if trying to access admin routes
    if (requiredRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Use userRole from context as the source of truth, fallback to user.role
  const currentRole = userRole || user.role;

  if (requiredRole && currentRole !== requiredRole) {
    // If trying to access admin routes without admin role, redirect to admin login
    if (requiredRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (userType && currentRole !== userType) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
