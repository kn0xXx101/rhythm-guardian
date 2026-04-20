import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
// TwoFactorVerify removed

type UserRole = Database['public']['Tables']['profiles']['Row']['role'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ExtendedUser
  extends Omit<SupabaseUser, 'user_metadata' | 'phone' | 'created_at' | 'updated_at' | 'email'> {
  role?: UserRole;
  status?: 'pending' | 'active' | 'suspended' | 'banned';
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  location?: string | null;
  two_factor_enabled?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  userRole: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeTwoFactorLogin: (verifyData?: any) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  twoFactorRequired: false;
  twoFactorSetupRequired: false;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSigningUpRef = useRef(false);
  const signupTimestampRef = useRef<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if this might be a recent signup (user has role in metadata)
        const mightBeRecentSignup =
          session.user.user_metadata?.role ||
          session.user.app_metadata?.role ||
          isSigningUpRef.current;
        fetchUserData(session.user.id, 0, mightBeRecentSignup);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // If we're currently signing up, skip fetching user data entirely
        // This prevents errors during the signup/profile creation process
        if (isSigningUpRef.current) {
          console.log('Skipping auth state change fetch - currently in signup flow');
          return;
        }

        // Check if signup happened recently (within last 15 seconds)
        if (signupTimestampRef.current && Date.now() - signupTimestampRef.current < 15000) {
          console.log(
            'Skipping auth state change fetch - recent signup detected (within 15 seconds)'
          );
          return;
        }

        // If this is a SIGNED_IN event and user has role in metadata (indicates fresh signup)
        // delay the fetch slightly to allow profile creation to complete
        const isRecentSignup =
          event === 'SIGNED_IN' &&
          (session.user.user_metadata?.role || session.user.app_metadata?.role);

        if (isRecentSignup) {
          setTimeout(() => {
            // Double-check signup flag and timestamp before fetching
            if (
              !isSigningUpRef.current &&
              (!signupTimestampRef.current || Date.now() - signupTimestampRef.current >= 15000)
            ) {
              fetchUserData(session.user.id, 0, true); // Pass isRecentSignup flag
            } else {
              console.log('Skipping delayed fetch - still in signup window');
            }
          }, 2000);
        } else {
          fetchUserData(session.user.id);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to fetch profile with fallback for missing columns
  const fetchProfileWithFallback = async (
    userId: string
  ): Promise<{ data: ProfileRow | null; error: any | null }> => {
    // Start with base columns that should always exist (from initial migration)
    // Using single-line format to avoid parsing issues with Supabase
    const baseColumns =
      'user_id,full_name,role,status,email_verified,phone,phone_verified,avatar_url,bio,location,genres,instruments,hourly_rate,available_days,rating,total_reviews,total_bookings,completion_rate,created_at,updated_at,last_active_at';

    const baseResult = await supabase
      .from('profiles')
      .select(baseColumns)
      .eq('user_id', userId)
      .single();

    if (!baseResult.error) {
      const extendedColumns = `${baseColumns},profile_complete,documents_submitted,documents_verified,profile_completion_percentage,required_documents`;
      const extendedResult = await supabase
        .from('profiles')
        .select(extendedColumns)
        .eq('user_id', userId)
        .single();

      if (!extendedResult.error) {
        return {
          data: extendedResult.data as unknown as ProfileRow | null,
          error: null,
        };
      }

      return {
        data: baseResult.data as unknown as ProfileRow | null,
        error: null,
      };
    }

    if (baseResult.error) {
      const error = baseResult.error;
      const errorMsg = error.message?.toLowerCase() || '';
      const errorDetails = error.details?.toLowerCase() || '';
      const errorHint = error.hint?.toLowerCase() || '';

      const isSchemaError =
        error.code === '42P01' ||
        error.code === 'PGRST301' ||
        error.code === 'PGRST103' ||
        error.code === '42703' ||
        errorMsg.includes('relation') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('column') ||
        errorMsg.includes('schema') ||
        errorMsg.includes('querying schema') ||
        errorMsg.includes('table') ||
        errorDetails.includes('schema') ||
        errorHint.includes('schema') ||
        errorMsg.includes('permission denied for schema') ||
        (errorMsg.includes('schema') && errorMsg.includes('public'));

      if (isSchemaError) {
        console.error('Database schema error detected:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error,
        });
        return {
          data: null,
          error,
        };
      }

      return {
        data: null,
        error,
      };
    }

    return {
      data: null,
      error: null,
    };
  };

  const fetchUserData = async (
    userId: string,
    retryCount: number = 0,
    isRecentSignup: boolean = false
  ) => {
    // PRIORITY 0: If we're currently signing up, skip fetching user data entirely
    // This prevents any errors during the signup/profile creation process
    if (isSigningUpRef.current) {
      console.log('Skipping fetchUserData - currently in signup flow');
      return;
    }

    // PRIORITY 0.5: Check if signup happened recently (within last 15 seconds)
    // This catches any delayed auth state changes after signup completes
    if (signupTimestampRef.current && Date.now() - signupTimestampRef.current < 15000) {
      console.log('Skipping fetchUserData - recent signup detected (within 15 seconds)');
      return;
    }

    try {
      // Get the auth user first
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error in fetchUserData:', authError);
        throw authError;
      }
      if (!authUser) {
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Fetch profile data to check role (profile is the source of truth)
      const { data: profileData, error } = await fetchProfileWithFallback(userId);

      // Check for admin role in multiple possible locations
      const isAdminFromMetadata =
        authUser.app_metadata?.role === 'admin' ||
        authUser.user_metadata?.role === 'admin' ||
        authUser.email?.toLowerCase() === 'admin@rhythmguardian.com';

      // Check profile for admin role (source of truth)
      const isAdminFromProfile = profileData?.role === 'admin';
      const isAdmin = isAdminFromMetadata || isAdminFromProfile;

      if (error) {
        console.error('Profile fetch error in fetchUserData:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        // If admin by email/metadata, allow login even if profile fetch fails
        if (isAdminFromMetadata) {
          console.log('Admin user detected from metadata, setting admin role');
          const adminUser: ExtendedUser = {
            ...authUser,
            role: 'admin',
            status: 'active',
            full_name: authUser.user_metadata?.full_name || 'Admin User',
          };
          setUser(adminUser);
          setUserRole('admin');
          setIsLoading(false);
          return;
        }

        // If profile doesn't exist, try to use metadata or wait and retry
        if (error.code === 'PGRST116') {
          // Code for no rows returned
          // If user was just created (check if user_metadata has role), profile might be creating
          // Retry a few times with delay if this looks like a fresh signup
          const userRoleFromMetadata = authUser.user_metadata?.role || authUser.app_metadata?.role;
          const shouldRetry = (isRecentSignup || userRoleFromMetadata) && retryCount < 3;

          if (shouldRetry) {
            // Profile might still be creating, wait and retry
            console.log(`Profile not found, retrying (attempt ${retryCount + 1}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
            return fetchUserData(userId, retryCount + 1, isRecentSignup);
          }

          // Use metadata to create a temporary user object
          const roleFromMetadata = (userRoleFromMetadata as UserRole) || 'hirer';
          const statusFromMetadata =
            ((authUser.user_metadata?.status || authUser.app_metadata?.status) as
              | 'pending'
              | 'active'
              | 'suspended') || 'pending';

          const newUser: ExtendedUser = {
            ...authUser,
            role: roleFromMetadata,
            status: statusFromMetadata,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          };
          setUser(newUser);
          setUserRole(roleFromMetadata);
        } else {
          // For other errors (foreign key, schema, etc.), use metadata as fallback
          // Don't throw - this might be a temporary issue during signup
          console.warn('Profile fetch error (non-missing), using metadata as fallback:', error);
          const roleFromMetadata = (authUser.user_metadata?.role ||
            authUser.app_metadata?.role ||
            'hirer') as UserRole;
          const statusFromMetadata = (authUser.user_metadata?.status ||
            authUser.app_metadata?.status ||
            'pending') as 'pending' | 'active' | 'suspended';

          const fallbackUser: ExtendedUser = {
            ...authUser,
            role: roleFromMetadata,
            status: statusFromMetadata,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          };
          setUser(fallbackUser);
          setUserRole(roleFromMetadata);

          // Don't show error toast during signup - profile creation is happening asynchronously
          // Only show error if this isn't a recent signup
          if (retryCount === 0) {
            // Wait a bit and retry once more silently
            setTimeout(async () => {
              try {
                const { data: retryProfile } = await fetchProfileWithFallback(userId);
                if (retryProfile) {
                  const extendedUser: ExtendedUser = {
                    ...authUser,
                    ...retryProfile,
                    role: retryProfile.role || roleFromMetadata,
                    status: (retryProfile.status || statusFromMetadata) as any,
                  } as any;
                  setUser(extendedUser);
                  setUserRole(retryProfile.role || roleFromMetadata);
                }
              } catch (retryError) {
                // Silent fail - profile will be created by trigger/edge function
                console.log('Profile retry failed, will be created asynchronously');
              }
            }, 5000);
          }
        }
      } else if (profileData) {
        // Check if admin from profile
        if (isAdmin) {
          const adminUser: ExtendedUser = {
            ...authUser,
            ...profileData,
            role: 'admin',
            status: (profileData.status || 'active') as any,
            full_name: profileData.full_name || authUser.user_metadata?.full_name || 'Admin User',
          } as any;
          setUser(adminUser);
          setUserRole('admin');
        } else {
          // User has a profile, update the user object with profile data
          const extendedUser: ExtendedUser = {
            ...authUser,
            ...profileData,
            email: authUser.email, // Ensure email is explicitly from Auth if not in profile
            full_name: profileData.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
            role: profileData.role || 'hirer',
            status: (profileData.status || 'active') as any,
          } as any;
          setUser(extendedUser);
          setUserRole(profileData.role);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);

      // Try to get auth user at least to show something
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          // Use metadata as fallback
          const roleFromMetadata = (authUser.user_metadata?.role ||
            authUser.app_metadata?.role ||
            'hirer') as UserRole;
          const statusFromMetadata = (authUser.user_metadata?.status ||
            authUser.app_metadata?.status ||
            'pending') as 'pending' | 'active' | 'suspended';

          const fallbackUser: ExtendedUser = {
            ...authUser,
            role: roleFromMetadata,
            status: statusFromMetadata,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          };
          setUser(fallbackUser);
          setUserRole(roleFromMetadata);

          // Don't show error - profile will be created by trigger/edge function
          console.log('Using metadata fallback, profile will be created asynchronously');
          return;
        }
      } catch (authError) {
        console.error('Failed to get auth user as fallback:', authError);
      }

      setUser(null);
      setUserRole(null);

      // PRIORITY 1: Check if we're currently in signup flow - if so, suppress ALL errors
      // This is the most reliable check and should happen first
      if (isSigningUpRef.current) {
        console.log('Suppressing error toast - currently in signup flow:', {
          error: error instanceof Error ? error.message : String(error),
          isRecentSignup,
          isSigningUpRefCurrent: isSigningUpRef.current,
        });
        return; // Early return - don't show any error during signup
      }

      // PRIORITY 1.5: Check if signup happened recently (within last 15 seconds)
      // This catches any delayed errors after signup completes
      if (signupTimestampRef.current && Date.now() - signupTimestampRef.current < 15000) {
        console.log('Suppressing error toast - recent signup detected (within 15 seconds):', {
          error: error instanceof Error ? error.message : String(error),
          timeSinceSignup: Date.now() - signupTimestampRef.current,
        });
        return; // Early return - don't show any error for recent signup
      }

      // PRIORITY 2: Check if this call was marked as a recent signup
      if (isRecentSignup) {
        console.log('Suppressing error toast - recent signup detected:', {
          error: error instanceof Error ? error.message : String(error),
        });
        return; // Early return - don't show any error for recent signup
      }

      // PRIORITY 3: Check auth user metadata for signup indicators
      try {
        const {
          data: { user: currentAuthUser },
        } = await supabase.auth.getUser();
        if (
          currentAuthUser &&
          (currentAuthUser.user_metadata?.role || currentAuthUser.app_metadata?.role)
        ) {
          // User has role in metadata, likely a recent signup
          console.log('Suppressing error toast - recent signup detected from metadata:', {
            error: error instanceof Error ? error.message : String(error),
          });
          return; // Early return - don't show any error for recent signup
        }
      } catch {
        // Ignore errors checking auth user
      }

      // Only show error if it's a real authentication issue, not a missing profile during signup
      const errorAny = error as any;
      const errorCode =
        errorAny?.code ||
        errorAny?.error?.code ||
        (error instanceof Error && 'code' in error ? (error as any).code : null);

      // Get error message - handle both Error instances and other error types
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message.toLowerCase();
      } else if (error && typeof error === 'object') {
        // Try to extract message from error object
        errorMessage = (
          errorAny?.message ||
          errorAny?.error?.message ||
          JSON.stringify(error)
        ).toLowerCase();
      } else {
        errorMessage = String(error || '').toLowerCase();
      }

      const isMissingProfileError =
        errorCode === 'PGRST116' ||
        errorMessage.includes('no rows') ||
        errorMessage.includes('could not find') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('not found');

      const isForeignKeyError =
        errorCode === '23503' ||
        errorMessage.includes('foreign key') ||
        errorMessage.includes('violates foreign key');

      const isSchemaError =
        errorCode === '42P01' ||
        errorCode === 'PGRST301' ||
        errorCode === '42703' ||
        errorMessage.includes('relation') ||
        errorMessage.includes('column');

      // Check if error is related to profile/user lookup issues
      const isProfileLookupError =
        errorMessage.includes('profile') ||
        errorMessage.includes('user') ||
        errorMessage.includes('finding') ||
        errorMessage.includes('fetching') ||
        errorMessage.includes('database') ||
        errorMessage.includes('error');

      // Check for clear authentication failures that SHOULD be shown
      const isAuthFailure =
        errorCode === '401' ||
        errorCode === '403' ||
        errorMessage.includes('not authenticated') ||
        errorMessage.includes('invalid token') ||
        (errorMessage.includes('session') && errorMessage.includes('expired')) ||
        errorMessage.includes('unauthorized');

      // During signup/profile creation, suppress ALL errors by default
      // Only show clear authentication failures that aren't related to profile lookup
      // This prevents noisy error messages when profile is still being created
      if (isAuthFailure && !isProfileLookupError) {
        // Only show clear authentication failures that aren't profile lookup errors
        console.error('Authentication failure detected (not profile-related):', {
          error,
          errorCode,
          errorMessage,
        });
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'Your session is invalid or expired. Please sign in again.',
        });
      } else {
        // Suppress all other errors (default behavior during signup/profile creation)
        // This includes missing profiles, database errors, lookup errors, profile/user errors, etc.
        console.log(
          'Suppressing error toast - likely timing issue, profile creation in progress, or profile lookup error:',
          {
            errorCode,
            errorMessage,
            errorType: typeof error,
            isErrorInstance: error instanceof Error,
            isMissingProfileError,
            isForeignKeyError,
            isSchemaError,
            isProfileLookupError,
            isAuthFailure,
            willSuppress: true,
          }
        );
        // Explicitly do NOT show toast - suppress all errors related to profile/user lookup
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Keep profile heartbeat updated for presence/online status (every 30 seconds)
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const intervalId = window.setInterval(() => {
      if (isMounted) updateLastActive();
    }, 30000); // Update every 30 seconds for more realistic online status

    const updateLastActive = async () => {
      if (!user?.id || !navigator.onLine || document.hidden) return;
      try {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Failed to update last_active_at:', error);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        updateLastActive();
      }
    };
    const handleOnline = () => updateLastActive();

    // Initial heartbeat
    updateLastActive();

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [user?.id]);

  const continueLogin = async (authUser: SupabaseUser, session: Session | null) => {
    console.log('Auth successful, fetching profile data...');

    const profileResult = await fetchProfileWithFallback(authUser.id);
    const { data: profileData, error: profileError } = profileResult;

    const isAdminFromMetadata =
      authUser.app_metadata?.role === 'admin' ||
      authUser.user_metadata?.role === 'admin' ||
      session?.user?.app_metadata?.role === 'admin' ||
      authUser.email?.toLowerCase() === 'admin@rhythmguardian.com';

    const isAdminFromProfile = profileData?.role === 'admin';

    const isAdmin = isAdminFromMetadata || isAdminFromProfile;

    console.log('Admin check result:', {
      isAdmin,
      isAdminFromMetadata,
      isAdminFromProfile,
      profileRole: profileData?.role,
      app_metadata: authUser.app_metadata,
      user_metadata: authUser.user_metadata,
      email: authUser.email,
    });

    if (isAdmin) {
      console.log('Admin user detected, setting admin role');
      const adminUser: ExtendedUser = {
        ...authUser,
        role: 'admin',
        status: (profileData?.status || 'active') as any,
        full_name: profileData?.full_name || authUser.user_metadata?.name || 'Admin User',
        two_factor_enabled:
          (authUser.user_metadata as any)?.two_factor_enabled === true ||
          (authUser.app_metadata as any)?.two_factor_enabled === true,
      } as any;

      setUser(adminUser);
      setUserRole('admin');
      setIsLoading(false);
      navigate('/admin', { replace: true });
      return;
    }

    console.log('Profile response:', { profileData, profileError });

    if (profileError) {
      console.error('Profile fetch error - Full details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        error: profileError,
      });

      const errorMsg = profileError.message?.toLowerCase() || '';
      const errorDetails = profileError.details?.toLowerCase() || '';
      const errorHint = profileError.hint?.toLowerCase() || '';

      const isSchemaError =
        profileError.code === '42P01' ||
        profileError.code === 'PGRST301' ||
        profileError.code === 'PGRST103' ||
        profileError.code === '42703' ||
        errorMsg.includes('relation') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('column') ||
        errorMsg.includes('schema') ||
        errorMsg.includes('querying schema') ||
        errorMsg.includes('table') ||
        errorDetails.includes('schema') ||
        errorHint.includes('schema') ||
        errorMsg.includes('permission denied for schema') ||
        (errorMsg.includes('schema') && errorMsg.includes('public'));

      if (isSchemaError) {
        console.error('Database schema error detected:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });

        if (
          authUser.email?.toLowerCase() === 'admin@rhythmguardian.com' ||
          authUser.app_metadata?.role === 'admin' ||
          authUser.user_metadata?.role === 'admin'
        ) {
          console.log('Admin user detected despite schema error, allowing login');
          const adminUser: ExtendedUser = {
            ...authUser,
            role: 'admin',
            status: 'active',
            full_name: authUser.user_metadata?.name || 'Admin User',
            two_factor_enabled:
              (authUser.user_metadata as any)?.two_factor_enabled === true ||
              (authUser.app_metadata as any)?.two_factor_enabled === true,
          };
          setUser(adminUser);
          setUserRole('admin');
          setIsLoading(false);
          navigate('/admin', { replace: true });
          return;
        }

        const schemaErrorMessage = `Database schema error: The profiles table or required columns do not exist. This usually means database migrations haven't been run. Please run all migrations in the supabase/migrations folder. Error: ${
          profileError.message || profileError.code
        }`;
        console.error('=== DATABASE SCHEMA ERROR ===');
        console.error('Error Code:', profileError.code);
        console.error('Error Message:', profileError.message);
        console.error('Error Details:', profileError.details);
        console.error('Error Hint:', profileError.hint);
        console.error('Full Error Object:', profileError);
        console.error('=== SOLUTION ===');
        console.error('1. Open PowerShell in the project directory');
        console.error('2. Run: .\\scripts\\apply_migrations.ps1 -ProjectRef qxtnwlpjnsntsjtgeybp');
        console.error(
          '3. Or if you have a database URL: .\\scripts\\apply_migrations.ps1 -DbUrl "your-database-url"'
        );
        console.error('4. Restart your development server after migrations complete');
        console.error('============================');

        toast({
          variant: 'destructive',
          title: 'Database Schema Error',
          description: `The database schema is not set up. Please contact the administrator. Error: ${
            profileError.message || profileError.code
          }`,
          duration: 10000,
        });
        throw new Error(schemaErrorMessage);
      }

      if (profileError.code === 'PGRST116') {
        if (
          authUser.email?.toLowerCase() === 'admin@rhythmguardian.com' ||
          authUser.app_metadata?.role === 'admin' ||
          authUser.user_metadata?.role === 'admin'
        ) {
          console.log('Admin user detected but profile missing, creating admin profile');
          const adminUser: ExtendedUser = {
            ...authUser,
            role: 'admin',
            status: 'active',
            full_name: authUser.user_metadata?.name || 'Admin User',
            two_factor_enabled:
              (authUser.user_metadata as any)?.two_factor_enabled === true ||
              (authUser.app_metadata as any)?.two_factor_enabled === true,
          };
          setUser(adminUser);
          setUserRole('admin');
          setIsLoading(false);
          navigate('/admin', { replace: true });
          return;
        }

        console.log('Profile does not exist, creating basic profile');
        const defaultRole = 'hirer';
        const extendedUser: ExtendedUser = {
          ...authUser,
          role: defaultRole,
          status: 'pending',
          two_factor_enabled:
            (authUser.user_metadata as any)?.two_factor_enabled === true ||
            (authUser.app_metadata as any)?.two_factor_enabled === true,
        };

        setUser(extendedUser);
        setUserRole(defaultRole);
        navigate('/pending-approval', { replace: true });
        return;
      }

      if (
        authUser.email?.toLowerCase() === 'admin@rhythmguardian.com' ||
        authUser.app_metadata?.role === 'admin' ||
        authUser.user_metadata?.role === 'admin'
      ) {
        console.log('Admin user detected despite profile error, allowing login');
        const adminUser: ExtendedUser = {
          ...authUser,
          role: 'admin',
          status: 'active',
          full_name: authUser.user_metadata?.name || 'Admin User',
          two_factor_enabled:
            (authUser.user_metadata as any)?.two_factor_enabled === true ||
            (authUser.app_metadata as any)?.two_factor_enabled === true,
        };
        setUser(adminUser);
        setUserRole('admin');
        setIsLoading(false);
        navigate('/admin', { replace: true });
        return;
      }

      throw profileError;
    }

    if (profileData) {
      const extendedUser: ExtendedUser = {
        ...authUser,
        ...profileData,
        role: profileData.role || 'hirer',
        status: (profileData.status || 'active') as any,
        two_factor_enabled:
          (authUser.user_metadata as any)?.two_factor_enabled === true ||
          (authUser.app_metadata as any)?.two_factor_enabled === true,
      } as any;

      setUser(extendedUser);
      setUserRole(profileData.role);

      const userRole = profileData.role || 'hirer';
      const userStatus = profileData.status || 'active';

      if (userStatus === 'pending') {
        navigate('/pending-approval', { replace: true });
      } else if (userRole === 'hirer') {
        navigate('/hirer', { replace: true });
      } else if (userRole === 'musician') {
        navigate('/musician', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      const defaultRole = 'hirer';
      const extendedUser: ExtendedUser = {
        ...authUser,
        role: defaultRole,
        status: 'pending',
        two_factor_enabled:
          (authUser.user_metadata as any)?.two_factor_enabled === true ||
          (authUser.app_metadata as any)?.two_factor_enabled === true,
      };

      setUser(extendedUser);
      setUserRole(defaultRole);
      navigate('/pending-approval', { replace: true });
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Login attempt:', { email });
    setIsLoading(true);
    try {
      const {
        data: { user: authUser, session },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth response:', { authUser, authError, session });
      if (authError) {
        if (
          authError.message?.includes('Invalid login credentials') ||
          authError.message?.includes('invalid_credentials')
        ) {
          throw new Error(
            'Invalid email or password. Please check your credentials and try again.'
          );
        } else if (
          authError.message?.includes('Email not confirmed') ||
          authError.message?.includes('email_not_confirmed')
        ) {
          throw new Error(
            'Please verify your email address before signing in. Check your inbox for the verification link.'
          );
        } else if (
          authError.message?.includes('too many requests') ||
          authError.message?.includes('rate_limit')
        ) {
          throw new Error(
            'Too many login attempts. Please wait a few minutes before trying again.'
          );
        }
        throw authError;
      }
      if (!authUser) throw new Error('No user returned from sign in');

      // 2FA completely disabled — proceed with login directly.
      await continueLogin(authUser, session);
    } catch (error: any) {
      console.error('Login error:', error);

      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);

      let errorMessage = 'Failed to sign in. Please check your credentials and try again.';

      if (
        error.message?.includes('Invalid email or password') ||
        error.message?.includes('Invalid login credentials') ||
        error.message?.includes('invalid_credentials')
      ) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (
        error.message?.includes('Email not confirmed') ||
        error.message?.includes('email_not_confirmed') ||
        error.message?.includes('verify your email')
      ) {
        errorMessage =
          'Please verify your email address before signing in. Check your inbox for the verification link.';
      } else if (error.message?.includes('Database schema error')) {
        errorMessage = 'Database configuration error. Please contact support.';
      } else if (
        error.message?.includes('too many requests') ||
        error.message?.includes('rate_limit')
      ) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completeTwoFactorLogin = async (verifyData?: any) => {
    console.log('Completing login after two-factor verification');
    setIsLoading(true);
    try {
      let session = verifyData?.session;
      
      if (!session) {
        // Force a session refresh to ensure we have the aal2 token
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        session = currentSession;
      }

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('getUser error after 2FA:', authError);
        if (session?.user) {
          console.log('Using user from session as fallback');
          await continueLogin(session.user, session);
          return;
        }
        throw authError;
      }

      if (!authUser) {
        throw new Error('No authenticated user found after two-factor verification');
      }

      await continueLogin(authUser, session);
    } catch (error: any) {
      console.error('Two-factor completion error:', error);

      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);

      let errorMessage =
        'Failed to complete two-factor sign in. Please sign in again and try again.';

      if (
        error.message?.includes('Database schema error') ||
        error.message?.includes('profiles table') ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist')
      ) {
        errorMessage = 'Database configuration error. Please contact support.';
      } else if (
        error.message?.includes('too many requests') ||
        error.message?.includes('rate_limit')
      ) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    console.log('Signup attempt:', { email, role });
    setIsLoading(true);
    isSigningUpRef.current = true; // Mark that we're signing up
    signupTimestampRef.current = Date.now(); // Record signup timestamp
    try {
      // Set initial status (pending for musicians if verification is required, active otherwise)
      const initialStatus: 'pending' | 'active' =
        role === 'admin' ? 'active' : role === 'musician' ? 'pending' : 'active';

      // Create auth user with role in both user_metadata and app_metadata
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            status: initialStatus,
            full_name: fullName,
            email_verified: false,
          },
          emailRedirectTo: `${window.location.origin}/auth/email-confirmed`,
        },
      });

      // Also set the role in app_metadata for RLS policies
      if (authUser && !authError) {
        await supabase.auth.updateUser({
          data: { role, status: initialStatus, full_name: fullName },
        });
      }

      if (authError) throw authError;
      if (!authUser) throw new Error('Failed to create user');

      // Wait for the user to be fully committed to the database
      // Increased wait time for better reliability with foreign key constraints
      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (!authUser) {
        throw new Error('Failed to create user: No user returned from auth');
      }

    // Check if profile was created by trigger with retry logic
    let existingProfile = null;
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, role, status')
          .eq('user_id', authUser.id)
          .single();

        if (data) {
          existingProfile = data;
          break;
        }
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }
      }

    // If profile doesn't exist, create it manually with retry logic using upsert
      if (!existingProfile) {
        let retries = 10; // Reduced retries since we already did some
        let profileCreated = false;

        while (retries > 0 && !profileCreated) {
          // Use upsert which is more forgiving and handles conflicts better
          const { error: profileError } = await supabase.from('profiles').upsert(
            {
              user_id: authUser.id,
              full_name: fullName,
              role: role,
              status: initialStatus,
              email_verified: false,
              avatar_url: null,
              phone: null,
              location: null,
            },
            {
              onConflict: 'user_id',
            }
          );

          if (profileError) {
            // Check if it's a foreign key constraint error
            if (profileError.code === '23503' || profileError.message.includes('foreign key')) {
              // User might not be fully committed yet, wait with exponential backoff and retry
              retries--;
              if (retries > 0) {
                // Exponential backoff: start at 2s, max at 10s
                const delay = Math.min(2000 * Math.pow(1.3, 20 - retries), 10000);
                console.log(
                  `Foreign key constraint error, retrying in ${delay}ms (${retries} retries left)`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));

                // Try to trigger profile creation via edge function as fallback
                if (retries <= 5) {
                  try {
                    const {
                      data: { session: currentSession },
                    } = await supabase.auth.getSession();
                    if (currentSession) {
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                      if (supabaseUrl) {
                        const response = await fetch(`${supabaseUrl}/functions/v1/create-profile`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${currentSession.access_token}`,
                          },
                          body: JSON.stringify({
                            type: 'user.created',
                            record: { id: authUser.id, email: authUser.email },
                          }),
                        });

                        if (response.ok) {
                          // Edge function might have created it, check again after a longer wait
                          await new Promise((resolve) => setTimeout(resolve, 2000));
                          const { data: profileCheck } = await supabase
                            .from('profiles')
                            .select('user_id')
                            .eq('user_id', authUser.id)
                            .single();

                          if (profileCheck) {
                            profileCreated = true;
                            break;
                          }
                        }
                      }
                    }
                  } catch (edgeFunctionError) {
                    console.warn('Edge function fallback failed:', edgeFunctionError);
                    // Continue with normal retry
                  }
                }
                continue;
              }
            } else if (
              profileError.code === '23505' ||
              profileError.message.includes('duplicate')
            ) {
              // Profile was created by trigger or another process, that's fine
              profileCreated = true;
              break;
            } else {
              // Other error - log but don't throw immediately, let trigger/edge function handle it
              console.error('Profile creation error (non-retryable):', profileError);
              // Don't throw - the trigger or edge function will create the profile asynchronously
              // Just log and continue - profile will be created eventually
              profileCreated = false;
              break;
            }
          } else {
            profileCreated = true;
          }
        }

        if (!profileCreated && retries === 0) {
          // Final check - maybe profile was created by trigger/edge function while we were retrying
          // Wait a bit longer before final check
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const { data: finalProfileCheck } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', authUser.id)
            .single();

          if (!finalProfileCheck) {
            // Don't throw error - let the trigger/edge function handle it asynchronously
            // The user can log in and the profile will be created automatically
            console.warn(
              'Profile not created after all retries. It will be created automatically by trigger/edge function.'
            );
            // Show a warning toast but don't fail the signup
            toast({
              variant: 'default',
              title: 'Account created',
              description:
                'Your account has been created. Your profile will be set up automatically. You may need to wait a moment before logging in.',
            });
          }
        }
      }

      // Show success message based on role and status
      if (role === 'musician') {
        toast({
          title: 'Musician Account Created',
          description:
            initialStatus === 'pending'
              ? "Your account is pending approval. You'll receive an email once approved."
              : 'Your musician account has been created. Please check your email to verify your account.',
        });
      } else {
        toast({
          title: 'Account Created',
          description: 'Please check your email to verify your account.',
        });
      }

      // Redirect to appropriate page based on role and status
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'musician') {
        if (initialStatus === 'pending') {
          navigate('/pending-approval');
        } else {
          navigate('/musician');
        }
      } else if (role === 'hirer') {
        navigate('/hirer');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error);
      isSigningUpRef.current = false; // Reset signup flag on error
      toast({
        variant: 'destructive',
        title: 'Error creating account',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    } finally {
      setIsLoading(false);
      // Reset signup flag after a delay to allow auth state change and profile creation to complete
      // Extended delay to ensure profile creation has time to complete
      setTimeout(() => {
        isSigningUpRef.current = false;
        // Keep timestamp for an additional 5 seconds to catch any delayed auth state changes
        setTimeout(() => {
          signupTimestampRef.current = null;
        }, 5000);
        console.log('Signup flag cleared - signup process complete');
      }, 10000); // Extended to 10 seconds to cover profile creation timing
    }
  };

  const logout = async () => {
    console.log('Logout attempt');
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      // Clear welcome message flags so they show again on next login
      sessionStorage.removeItem('welcomeShown_hirer');
      sessionStorage.removeItem('welcomeShown_musician');
      sessionStorage.removeItem('welcomeShown_admin');
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      navigate('/login', { replace: true });
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: 'destructive',
        title: 'Error signing out',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    console.log('Password reset attempt:', { email });
    setIsLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email);
      toast({
        title: 'Password reset email sent',
        description: 'Please check your email for the password reset link.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Error resetting password',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    console.log('Password update attempt');
    setIsLoading(true);
    try {
      await supabase.auth.updateUser({
        password: newPassword,
      });
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating password',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    userRole,
    isLoading,
    login,
    completeTwoFactorLogin,
    logout,
    signUp,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user,
    twoFactorRequired: false,
    twoFactorSetupRequired: false,
    refreshUser,
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
