import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useTheme();
  
  // Get admin colors or fallback to defaults
  const primaryColor = settings?.appearance?.primaryColor || '#FF8C00';
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { resetPassword } = useAuth();

  const onSubmit = async (values: ForgotPasswordValues) => {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      setEmailSent(true);
      toast({
        title: 'Reset Link Sent',
        description:
          'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send reset link. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                  className="w-16 h-16 object-contain transition-transform duration-300 hover:scale-105"
                  style={{
                    filter: `drop-shadow(0 0 8px ${primaryColor}40)`,
                  } as React.CSSProperties}
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>

          {!emailSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="email">Email</Label>
                        <FormControl>
                          <Input id="email" type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center">
                        <span className="mr-2 animate-spin">◌</span>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail size={16} className="mr-2" />
                        Send Reset Link
                      </div>
                    )}
                  </Button>

                  <Link
                    to="/login"
                    className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Login
                  </Link>
                </CardFooter>
              </form>
            </Form>
          ) : (
            <CardContent className="space-y-4 text-center">
              <div className="p-4">
                <Mail size={40} className="mx-auto text-primary mb-4" />
                <p className="text-lg font-medium mb-2">Check Your Email</p>
                <p className="text-muted-foreground mb-4">
                  We've sent a password reset link to your email address.
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>

              <Link
                to="/login"
                className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
