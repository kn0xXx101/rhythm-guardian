import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

const REFRESH_INTERVAL = 30000; // 30 seconds

const PendingApproval = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [nextRefresh, setNextRefresh] = useState(REFRESH_INTERVAL);

  // Check user status
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const status = user.user_metadata?.status;
      if (status === 'active') {
        toast({
          title: 'Account Approved!',
          description: 'Your account has been approved. You can now log in.',
        });
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1000) {
          checkStatus();
          return REFRESH_INTERVAL;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-2">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <Clock size={40} className="text-orange-600" aria-label="Pending approval" />
                <CheckCircle
                  size={16}
                  className="text-green-600 absolute -top-1 -right-1"
                  aria-label="Approved"
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Registration Submitted</CardTitle>
            <CardDescription>Your account is pending approval</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Thank you for registering with Rhythm Guardian! Your account has been successfully
                created and is now pending approval.
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail size={16} />
                <span>You'll receive an email notification once approved</span>
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                {isChecking ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Checking status...</span>
                  </div>
                ) : (
                  <div>Next refresh in {Math.ceil(nextRefresh / 1000)}s</div>
                )}
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">What happens next?</h3>
              <ul className="text-xs text-muted-foreground space-y-1 text-left">
                <li>• Our team will review your registration</li>
                <li>• You'll receive an email confirmation once approved</li>
                <li>• You can then log in and complete your profile</li>
                <li>• Start connecting with musicians or finding gigs!</li>
              </ul>
            </div>

            <div className="pt-4 space-y-2">
              <Button className="w-full" onClick={() => navigate('/login')}>
                Go to Login
              </Button>

              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Back to Home
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={checkStatus}
                disabled={isChecking}
              >
                {isChecking ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Checking Status...
                  </div>
                ) : (
                  'Check Status Now'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;
