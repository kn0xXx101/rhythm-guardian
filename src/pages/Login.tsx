import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, User, RefreshCw, Info } from 'lucide-react';

const Login = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedToastShown = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);

  const { login, resendConfirmation } = useAuth();

  useEffect(() => {
    if (verifiedToastShown.current) return;
    if (searchParams.get('verified') !== '1') return;
    verifiedToastShown.current = true;
    toast({
      variant: 'info',
      title: 'Email verified',
      description: 'Sign in with your email and password to continue.',
    });
    const next = new URLSearchParams(searchParams);
    next.delete('verified');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  // Check for pending confirmation email on component mount
  useEffect(() => {
    try {
      const pendingEmail = sessionStorage.getItem('pendingConfirmationEmail');
      if (pendingEmail) {
        setEmail(pendingEmail);
        setShowResendOption(true);
        sessionStorage.removeItem('pendingConfirmationEmail');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResendOption(false); // Hide resend option during login attempt

    try {
      await login(email, password);
      // Navigation is handled in AuthContext after successful login
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Check if this is an email confirmation issue
      if (errorMessage.includes('verify your email') || 
          errorMessage.includes('confirmation link') ||
          errorMessage.includes('Email not confirmed')) {
        setShowResendOption(true);
      }
      
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address first.',
      });
      return;
    }

    setIsResending(true);
    try {
      await resendConfirmation(email);
      setShowResendOption(false); // Hide after successful resend
    } catch (error) {
      // Error is handled in resendConfirmation function
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-fluid-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">Sign in to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {showResendOption && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Need to verify your email first?</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendConfirmation}
                    disabled={isResending || !email}
                    className="ml-2"
                  >
                    {isResending ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>Resend Email</span>
                      </div>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
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
                placeholder="••••••••"
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
                  <User className="h-4 w-4" />
                  <span>Sign in</span>
                </div>
              )}
            </Button>
            <div className="flex flex-col space-y-2">
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
              <div className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-muted-foreground hover:text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
