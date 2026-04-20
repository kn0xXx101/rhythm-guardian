import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { referralsService, PENDING_REFERRAL_STORAGE_KEY } from '@/services/referrals';
import { CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'verifying' | 'success' | 'error';

const REDIRECT_MS = 4000;

/**
 * Landing page for Supabase email confirmation (see AuthContext emailRedirectTo).
 * Shows a short progressive flow, attributes referrals, signs out, then sends users to login.
 */
export default function AuthEmailConfirmed() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const ran = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const hasAuthParams =
        typeof window !== 'undefined' &&
        (window.location.hash.includes('access_token') ||
          window.location.hash.includes('refresh_token') ||
          new URLSearchParams(window.location.search).has('code'));

      const waitForSession = async (attempts: number) => {
        for (let i = 0; i < attempts; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) return data.session;
          await new Promise((r) => setTimeout(r, 400));
        }
        return null;
      };

      const session = await waitForSession(hasAuthParams ? 12 : 4);

      if (!session?.user) {
        if (hasAuthParams) {
          setPhase('error');
          setErrorMessage(
            'We could not confirm your email from this link. It may have expired — request a new confirmation email or sign in if you are already verified.'
          );
        } else {
          setPhase('error');
          setErrorMessage('Open the confirmation link from your email to verify your account.');
        }
        return;
      }

      const email = session.user.email ?? '';
      const pendingRef = sessionStorage.getItem(PENDING_REFERRAL_STORAGE_KEY);
      if (pendingRef) {
        try {
          await referralsService.completeReferralSignup(pendingRef, session.user.id, email);
        } catch {
          // Non-fatal — referral may already be completed or invalid
        } finally {
          sessionStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
        }
      }

      await supabase.auth.signOut();

      setPhase('success');

      const start = Date.now();
      redirectTimer.current = setInterval(() => {
        const elapsed = Date.now() - start;
        setProgress(Math.min(100, (elapsed / REDIRECT_MS) * 100));
        if (elapsed >= REDIRECT_MS) {
          if (redirectTimer.current) clearInterval(redirectTimer.current);
          navigate('/login?verified=1', { replace: true });
        }
      }, 80);
    };

    void run();

    return () => {
      if (redirectTimer.current) clearInterval(redirectTimer.current);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Email confirmation</CardTitle>
          <CardDescription>Rhythm Guardian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <ol className="space-y-4">
            <StepRow
              done={phase !== 'verifying'}
              active={phase === 'verifying'}
              icon={<Loader2 className={cn('h-5 w-5', phase === 'verifying' && 'animate-spin')} />}
              title="Verifying your link"
              subtitle="Securing your session with our servers"
            />
            <StepRow
              done={phase === 'success'}
              active={phase === 'success'}
              icon={
                phase === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ShieldCheck className="h-5 w-5 opacity-40" />
                )
              }
              title="Email confirmed"
              subtitle="Your address is verified. Next, sign in with your password."
            />
          </ol>

          {phase === 'verifying' && (
            <div className="rounded-lg border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
              Please wait…
            </div>
          )}

          {phase === 'success' && (
            <div className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Taking you to sign in in a few seconds…
              </p>
              <Button className="w-full" onClick={() => navigate('/login?verified=1', { replace: true })}>
                Continue to sign in
              </Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">{errorMessage}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/login', { replace: true })}>
                  Go to sign in
                </Button>
                <Button className="flex-1" onClick={() => navigate('/signup', { replace: true })}>
                  Back to sign up
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepRow({
  done,
  active,
  icon,
  title,
  subtitle,
}: {
  done: boolean;
  active: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border p-3 transition-colors',
        active && 'border-primary/40 bg-primary/5',
        done && !active && 'border-green-500/30 bg-green-500/5'
      )}
    >
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </li>
  );
}
