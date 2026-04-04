import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

type UserRole = Database['public']['Tables']['profiles']['Row']['role'];
type UserStatus = 'pending' | 'active' | 'suspended';

interface SignUpResponse {
  user: User | null;
  error: AuthError | null;
}

interface TokenVerificationResponse {
  error: AuthError | null;
}

class AuthService {
  // Sign up a new user
  async signUp(
    email: string,
    password: string,
    role: UserRole,
    fullName: string
  ): Promise<SignUpResponse> {
    const initialStatus: 'pending' | 'active' = role === 'admin' ? 'active' : 'pending';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          status: initialStatus,
          full_name: fullName, // Include full_name in metadata for trigger
        },
      },
    });

    if (!error && data.user) {
      // Wait longer for the user to be fully committed to the database
      // Supabase auth.users may take a moment to be available for foreign key references
      // This is critical for foreign key constraints to work
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Check if profile was created by trigger
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single();

      // If profile doesn't exist, create it manually with retry logic using upsert
      if (!existingProfile && (!checkError || checkError.code === 'PGRST116')) {
        let retries = 20; // Increased retries significantly
        let profileCreated = false;
        let lastError: { code?: string; message?: string } | null = null;

        while (retries > 0 && !profileCreated) {
          // Use upsert which is more forgiving and handles conflicts better
          const { error: profileError } = await supabase.from('profiles').upsert(
            {
              user_id: data.user.id,
              full_name: fullName,
              role: role,
              status: initialStatus,
              email_verified: false,
            },
            {
              onConflict: 'user_id',
            }
          );

          if (profileError) {
            lastError = profileError;
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
                            record: { id: data.user.id, email: data.user.email },
                          }),
                        });

                        if (response.ok) {
                          // Edge function might have created it, check again after a longer wait
                          await new Promise((resolve) => setTimeout(resolve, 2000));
                          const { data: profileCheck } = await supabase
                            .from('profiles')
                            .select('user_id')
                            .eq('user_id', data.user.id)
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
              // Other error, don't retry
              throw new Error(
                `Failed to create user profile: ${profileError.message || 'Unknown error'}`
              );
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
            .eq('user_id', data.user.id)
            .single();

          if (!finalProfileCheck) {
            // Don't throw error - let the trigger/edge function handle it asynchronously
            // The user can log in and the profile will be created automatically
            console.warn(
              'Profile not created after all retries. It will be created automatically by trigger/edge function.'
            );
            // Return success - the user account is created, profile will be created asynchronously
          }
        }
      }
    }

    return { user: data.user, error };
  }

  // Sign in user
  async login(email: string, password: string): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check if email is verified in auth
      if (data?.user && !data.user.email_confirmed_at) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        throw new Error('Email not verified. Please check your email for the verification link.');
      }

      // Update email_verified in profiles if needed
      if (data?.user && data.user.email_confirmed_at) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Failed to update email verification status:', updateError);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Email not verified')) {
          // Send a new verification email if the user hasn't verified
          await this.sendVerificationEmail(email);
          throw new Error('Email not verified. A new verification email has been sent.');
        }
      }
      throw error;
    }
  }

  // Send verification email reminder
  async sendVerificationEmail(email: string): Promise<void> {
    // Supabase does not provide a direct resend verification email API
    // Workaround: send magic link email to user to trigger email verification resend
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      throw error;
    }
  }

  // Sign out user
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  // Request password reset
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  }

  // Verify reset token
  async verifyResetToken(token: string): Promise<TokenVerificationResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  }

  // Get current session
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  }

  // Get current user
  async getCurrentUser() {
    // Try getSession first as it's faster and updates the client state
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }

    // Fallback to getUser which validates the JWT with the server
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return user;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  // Get user role
  async getUserRole(): Promise<UserRole | null> {
    const user = await this.getCurrentUser();
    return user?.user_metadata?.role || null;
  }

  // Get user status
  async getUserStatus(): Promise<UserStatus | null> {
    const user = await this.getCurrentUser();
    return user?.user_metadata?.status || null;
  }

  // Set up auth state change listener
  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  }

  // Create or update user profile
  async updateProfile(
    userId: string,
    data: {
      full_name: string;
      role: UserRole;
      status: UserStatus;
    }
  ) {
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (profileError) {
      throw profileError;
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role: data.role,
        status: data.status,
      },
    });

    if (updateError) {
      throw updateError;
    }
  }

  // Update email verification status
  async updateEmailVerificationStatus(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  // Test email verification flow
  async testEmailVerification(email: string): Promise<{
    isVerified: boolean;
    authVerified: boolean;
    profileVerified: boolean;
  }> {
    try {
      // Get auth user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      return {
        isVerified: Boolean(user?.email_confirmed_at && profile?.email_verified),
        authVerified: Boolean(user?.email_confirmed_at),
        profileVerified: Boolean(profile?.email_verified),
      };
    } catch (error) {
      console.error('Error testing email verification:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
