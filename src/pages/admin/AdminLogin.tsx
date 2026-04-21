import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordRevealInput } from '@/components/ui/password-reveal-input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Shield } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login, user, userRole, logout } = useAuth();
  const hasCheckedRef = useRef(false);

  // Handle redirects and admin verification
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'admin') {
        // User is admin, redirect to dashboard
        if (
          window.location.pathname !== '/admin' &&
          !window.location.pathname.startsWith('/admin/')
        ) {
          navigate('/admin', { replace: true });
        }
      } else {
        // User logged in but is not an admin
        // Only show error and logout if they just logged in (not if they were already logged in)
        if (!hasCheckedRef.current) {
          hasCheckedRef.current = true;
          logout().then(() => {
            toast({
              variant: 'destructive',
              title: 'Access denied',
              description:
                'This account does not have admin privileges. Please use the regular login page.',
            });
            navigate('/login', { replace: true });
          });
        } else {
          // Already checked, just redirect
          navigate('/login', { replace: true });
        }
      }
    } else if (!user) {
      // Reset check flag if user logs out
      hasCheckedRef.current = false;
    }
  }, [user, userRole, navigate, logout, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      // Note: The login function in AuthContext will navigate based on role
      // The useEffect above will handle the admin check and redirect if needed
      // We don't navigate here to avoid conflicts
      // Loading state will be reset by navigation or finally block
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      // Reset loading state after a brief delay to allow navigation to complete
      // If navigation happens, component will unmount and this won't matter
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordRevealInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                leftAdornment={
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                }
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Sign in as Admin</span>
                </div>
              )}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-muted-foreground hover:underline">
                Back to regular login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
