import { useState, useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { useNavigate, useLocation, Link, useInRouterContext } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import type { Settings } from '@/types/settings';
import { supabase } from '@/lib/supabase';
import { PENDING_REFERRAL_STORAGE_KEY } from '@/services/referrals';
import {
  User,
  Mail,
  Lock,
  Music,
  Briefcase,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';

type UserRole = 'hirer' | 'musician' | 'admin';
type UserManagementSettings = NonNullable<Settings['userManagement']>;

const isUserManagementSettings = (value: unknown): value is UserManagementSettings => {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return (
    typeof settings.autoApproveHirers === 'boolean' &&
    typeof settings.requireMusicianVerification === 'boolean' &&
    typeof settings.allowSelfRegistration === 'boolean' &&
    typeof settings.maxProfileImages === 'number' &&
    typeof settings.requirePhoneVerification === 'boolean' &&
    typeof settings.minimumAge === 'number' &&
    typeof settings.profileCompletionRequired === 'boolean' &&
    typeof settings.backgroundCheckRequired === 'boolean'
  );
};

const signupSchema = z
  .object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
        'Password must contain at least one uppercase letter, one number, and one special character'
      ),
    confirmPassword: z.string(),
    acceptPolicies: z
      .boolean()
      .refine((v) => v === true, 'You must accept the Terms and Privacy Policy to continue.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

type NavigateFn = (path: string) => void;
type LinkPropsFactory = (path: string) => { to?: string; href?: string };
type LinkComponentType = ElementType;

const SignUpBase = ({
  navigate,
  locationSearch,
  getLinkProps,
  LinkComponent,
}: {
  navigate: NavigateFn;
  locationSearch: string;
  getLinkProps: LinkPropsFactory;
  LinkComponent: LinkComponentType;
}) => {
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [userManagementSettings, setUserManagementSettings] =
    useState<UserManagementSettings | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const searchParams = new URLSearchParams(locationSearch);
  const typeParam = searchParams.get('type');
  const referralFromUrl = searchParams.get('ref');
  const defaultUserType = typeParam === 'musician' ? 'musician' : 'hirer';
  const storedRefOnce = useRef(false);

  useEffect(() => {
    const ref = new URLSearchParams(locationSearch).get('ref');
    if (!ref || storedRefOnce.current) return;
    storedRefOnce.current = true;
    try {
      sessionStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, ref);
    } catch {
      // ignore private mode
    }
  }, [locationSearch]);

  const [userType, setUserType] = useState<'hirer' | 'musician'>(
    defaultUserType as 'hirer' | 'musician'
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'user_management')
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No user_management settings found, using defaults');
            setUserManagementSettings(null);
          } else {
            console.warn('Failed to load settings:', error);
            setUserManagementSettings(null);
          }
        } else {
          const value = settings?.value;
          setUserManagementSettings(isUserManagementSettings(value) ? value : null);
        }
      } catch (error) {
        console.warn('Error loading settings:', error);
        setUserManagementSettings(null);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptPolicies: false,
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);

    try {
      if (!userManagementSettings?.allowSelfRegistration) {
        toast({
          title: 'Registration Disabled',
          description: 'Self-registration is currently disabled. Please contact an administrator.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      await signUp(values.email, values.password, userType as UserRole, values.fullName);
      // AuthContext.signUp() handles the success toast and navigation to /login
    } catch (error) {
      // Handle specific Supabase signup errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      
      if (errorMessage.includes('User already registered') || 
          errorMessage.includes('already been registered') ||
          errorMessage.includes('email address is already registered') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('already exists')) {
        toast({
          title: 'Email Already Registered',
          description: 'This email is already registered. Please sign in instead or use a different email.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading registration settings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userManagementSettings?.allowSelfRegistration) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Registration Disabled</CardTitle>
            <CardDescription>Self-registration is currently disabled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                New user registration is temporarily disabled. Please contact an administrator for
                assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="default"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Join Rhythm Guardian</CardTitle>
          <CardDescription className="text-center">
            Create your account to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {referralFromUrl && (
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                You opened an invitation link. Complete sign up — when you verify your email, your
                referrer may earn rewards.
              </AlertDescription>
            </Alert>
          )}
          {/* Alerts */}
          {(userManagementSettings?.requireMusicianVerification ||
            !userManagementSettings?.autoApproveHirers) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {userType === 'musician' &&
                    userManagementSettings?.requireMusicianVerification &&
                    'After confirming your email, complete your profile and upload documents for admin verification. '}
                  {userType === 'hirer' &&
                    !userManagementSettings?.autoApproveHirers &&
                    'Hirer accounts require admin approval before activation. '}
                  Complete required musician details and upload documents to request verification.
                </AlertDescription>
              </Alert>
            )}

          {userManagementSettings?.minimumAge && userManagementSettings.minimumAge > 0 && (
            <Alert
              variant="default"
              className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
            >
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Minimum age requirement: {userManagementSettings.minimumAge} years old.
              </AlertDescription>
            </Alert>
          )}

          {/* User Type Tabs */}
          <Tabs
            value={userType}
            onValueChange={(value) => setUserType(value as 'hirer' | 'musician')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hirer" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Hire Musicians</span>
              </TabsTrigger>
              <TabsTrigger value="musician" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>Join as Musician</span>
              </TabsTrigger>
            </TabsList>

            {/* Hirer Form */}
            <TabsContent value="hirer" className="space-y-4 mt-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hirer-fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hirer-fullName"
                      type="text"
                      placeholder="John Doe"
                      className={`pl-9 ${form.formState.errors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      {...form.register('fullName')}
                    />
                  </div>
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hirer-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hirer-email"
                      type="email"
                      placeholder="name@example.com"
                      className={`pl-9 ${form.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hirer-password">Password</Label>
                  <PasswordRevealInput
                    id="hirer-password"
                    placeholder="••••••••"
                    showPassword={showPassword}
                    onToggleShow={() => setShowPassword((v) => !v)}
                    leftAdornment={
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    }
                    className={
                      form.formState.errors.password
                        ? 'border-destructive focus-visible:ring-destructive'
                        : undefined
                    }
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hirer-confirmPassword">Confirm Password</Label>
                  <PasswordRevealInput
                    id="hirer-confirmPassword"
                    placeholder="••••••••"
                    showPassword={showConfirmPassword}
                    onToggleShow={() => setShowConfirmPassword((v) => !v)}
                    leftAdornment={
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    }
                    className={
                      form.formState.errors.confirmPassword
                        ? 'border-destructive focus-visible:ring-destructive'
                        : undefined
                    }
                    {...form.register('confirmPassword')}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                    <Checkbox
                      id="hirer-accept-policies"
                      className="mt-0.5"
                      checked={Boolean(form.watch('acceptPolicies'))}
                      onCheckedChange={(v) => form.setValue('acceptPolicies', v === true, { shouldValidate: true })}
                    />
                    <div className="min-w-0">
                      <Label htmlFor="hirer-accept-policies" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
                        I agree to the{' '}
                        <LinkComponent {...getLinkProps('/terms')} className="text-primary hover:underline">
                          Terms of Service
                        </LinkComponent>{' '}
                        and{' '}
                        <LinkComponent {...getLinkProps('/privacy')} className="text-primary hover:underline">
                          Privacy Policy
                        </LinkComponent>
                        .
                      </Label>
                      {form.formState.errors.acceptPolicies && (
                        <p className="mt-2 text-sm text-destructive">
                          {String(form.formState.errors.acceptPolicies.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Create Hirer Account</span>
                    </div>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Musician Form */}
            <TabsContent value="musician" className="space-y-4 mt-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="musician-fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="musician-fullName"
                      type="text"
                      placeholder="John Doe"
                      className={`pl-9 ${form.formState.errors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      {...form.register('fullName')}
                    />
                  </div>
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="musician-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="musician-email"
                      type="email"
                      placeholder="name@example.com"
                      className={`pl-9 ${form.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="musician-password">Password</Label>
                  <PasswordRevealInput
                    id="musician-password"
                    placeholder="••••••••"
                    showPassword={showPassword}
                    onToggleShow={() => setShowPassword((v) => !v)}
                    leftAdornment={
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    }
                    className={
                      form.formState.errors.password
                        ? 'border-destructive focus-visible:ring-destructive'
                        : undefined
                    }
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="musician-confirmPassword">Confirm Password</Label>
                  <PasswordRevealInput
                    id="musician-confirmPassword"
                    placeholder="••••••••"
                    showPassword={showConfirmPassword}
                    onToggleShow={() => setShowConfirmPassword((v) => !v)}
                    leftAdornment={
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    }
                    className={
                      form.formState.errors.confirmPassword
                        ? 'border-destructive focus-visible:ring-destructive'
                        : undefined
                    }
                    {...form.register('confirmPassword')}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                    <Checkbox
                      id="musician-accept-policies"
                      className="mt-0.5"
                      checked={Boolean(form.watch('acceptPolicies'))}
                      onCheckedChange={(v) => form.setValue('acceptPolicies', v === true, { shouldValidate: true })}
                    />
                    <div className="min-w-0">
                      <Label htmlFor="musician-accept-policies" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
                        I agree to the{' '}
                        <LinkComponent {...getLinkProps('/terms')} className="text-primary hover:underline">
                          Terms of Service
                        </LinkComponent>{' '}
                        and{' '}
                        <LinkComponent {...getLinkProps('/privacy')} className="text-primary hover:underline">
                          Privacy Policy
                        </LinkComponent>
                        .
                      </Label>
                      {form.formState.errors.acceptPolicies && (
                        <p className="mt-2 text-sm text-destructive">
                          {String(form.formState.errors.acceptPolicies.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {userManagementSettings?.requireMusicianVerification && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your musician profile will require verification after signup
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      <span>Create Musician Account</span>
                    </div>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2 w-full">
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <LinkComponent
                {...getLinkProps('/login')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </LinkComponent>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{' '}
              <LinkComponent {...getLinkProps('/terms')} className="text-primary hover:underline">
                Terms of Service
              </LinkComponent>{' '}
              and{' '}
              <LinkComponent
                {...getLinkProps('/privacy')}
                className="text-primary hover:underline"
              >
                Privacy Policy
              </LinkComponent>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

const SignUpWithRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <SignUpBase
      navigate={navigate}
      locationSearch={location.search}
      getLinkProps={(path) => ({ to: path })}
      LinkComponent={Link}
    />
  );
};

const SignUpStandalone = () => {
  const locationSearch = typeof window !== 'undefined' ? window.location.search : '';
  const navigate: NavigateFn = (path) => {
    if (typeof window !== 'undefined') {
      window.location.assign(path);
    }
  };
  return (
    <SignUpBase
      navigate={navigate}
      locationSearch={locationSearch}
      getLinkProps={(path) => ({ href: path })}
      LinkComponent="a"
    />
  );
};

const SignUp = () => {
  const inRouter = useInRouterContext();
  return inRouter ? <SignUpWithRouter /> : <SignUpStandalone />;
};

export default SignUp;
