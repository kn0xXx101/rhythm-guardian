import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Key, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
        'Password must contain at least one uppercase letter, one number, and one special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useTheme();
  
  // Get admin colors or fallback to defaults
  const primaryColor = settings?.appearance?.primaryColor || '#FF8C00';
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isTokenChecking, setIsTokenChecking] = useState(true);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Verify the reset token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || type !== 'recovery') {
        setIsTokenValid(false);
        setIsTokenChecking(false);
        return;
      }

      try {
        // Verify token with Supabase
        const { error } = await authService.verifyResetToken(token);
        setIsTokenValid(!error);
      } catch (error) {
        setIsTokenValid(false);
        console.error('Token verification error:', error);
      } finally {
        setIsTokenChecking(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const onSubmit = async (values: ResetPasswordValues) => {
    setIsLoading(true);
    try {
      await authService.updatePassword(values.password);

      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been reset. You can now log in with your new password.',
      });
      navigate('/login');
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to reset password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while verifying token
  if (isTokenChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-2">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Verifying reset link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-2">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <AlertCircle size={40} className="text-destructive" />
              </div>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>This password reset link is invalid or has expired</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please request a new password reset link to continue.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                Request New Reset Link
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-2">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="relative group">
                {/* Audio Waveform Shield Logo */}
                <img 
                  src="/logo.svg" 
                  alt="Rhythm Guardian Logo"
                  className="w-20 h-20 object-contain transition-transform duration-300 hover:scale-105"
                  style={{
                    filter: `drop-shadow(0 0 8px ${primaryColor}40)`,
                  } as React.CSSProperties}
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                          </span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          <span className="sr-only">
                            {showConfirmPassword ? 'Hide password' : 'Show password'}
                          </span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter>
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center">
                      <span className="mr-2 animate-spin">◌</span>
                      Resetting Password...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Key size={16} className="mr-2" />
                      Reset Password
                    </div>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
