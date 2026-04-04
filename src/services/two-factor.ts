import { supabase } from '@/lib/supabase';

interface TwoFactorSetupResponse {
  otpauthUrl?: string;
  qrCodeSvg?: string;
  secretMasked?: string;
  backupCodes?: string[];
}

interface TwoFactorVerifyResponse {
  success: boolean;
  requiresBackupCode?: boolean;
}

export const twoFactorService = {
  async startSetup(): Promise<TwoFactorSetupResponse> {
    // Ensure we have a valid session before starting setup
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to set up two-factor authentication');
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Rhythm Guardian',
    });

    if (error) {
      console.error('MFA enroll error:', error);
      throw new Error(error.message || 'Failed to start 2FA setup');
    }

    return {
      qrCodeSvg: data.totp.qr_code, // This is a data URL image in native MFA
      secretMasked: data.totp.secret,
      backupCodes: [], // Native MFA handles backup codes separately or via unenrollment
    };
  },

  async confirmSetup(code: string): Promise<void> {
    // 1. Get the factor to verify
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const factor = factors.all.find(f => f.status === 'unverified' && f.factor_type === 'totp');
    if (!factor) throw new Error('No unverified TOTP factor found');

    // 2. Create a challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError) throw challengeError;

    // 3. Verify the challenge
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw verifyError;

    // 4. Update user metadata to sync with current app logic
    const { error: updateError } = await supabase.auth.updateUser({
      data: { two_factor_enabled: true }
    });
    if (updateError) throw updateError;
    
    // 5. Update profile table if needed
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Use any to bypass TypeScript error if column is missing from generated types
        // but exists in the actual database
        await (supabase
          .from('profiles') as any)
          .update({ two_factor_enabled: true })
          .eq('user_id', user.id);
      } catch (profileError) {
        console.warn('Failed to update two_factor_enabled in profiles table. This column may not exist yet:', profileError);
      }
    }
  },

  async disableTwoFactor(code: string): Promise<void> {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const factor = factors.all.find(f => f.status === 'verified' && f.factor_type === 'totp');
    if (!factor) throw new Error('No verified TOTP factor found');

    // 1. Create a challenge to verify the code
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError) throw challengeError;

    // 2. Verify the challenge
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw verifyError;

    // 3. Unenroll after verification
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    });
    if (unenrollError) throw unenrollError;

    // Sync metadata
    await supabase.auth.updateUser({
      data: { two_factor_enabled: false }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Use any to bypass TypeScript error
        await (supabase
          .from('profiles') as any)
          .update({ two_factor_enabled: false })
          .eq('user_id', user.id);
      } catch (profileError) {
        console.warn('Failed to update two_factor_enabled in profiles table:', profileError);
      }
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyCode(code: string, _token?: string): Promise<TwoFactorVerifyResponse & { data?: any }> {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const factor = factors.all.find(f => f.status === 'verified' && f.factor_type === 'totp');
    if (!factor) throw new Error('No verified TOTP factor found');

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError) throw challengeError;

    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      console.error('MFA verify error:', verifyError);
      return { success: false };
    }

    // Refresh the session so the client has the new aal2 token.
    // Without this, subsequent requests (like getUser()) see a stale token and
    // Supabase returns "Auth session missing!".
    try {
      // Use setSession to manually update the client state with the new session returned from verify
      if (verifyData?.session) {
        await supabase.auth.setSession(verifyData.session);
      } else {
        await supabase.auth.getSession();
      }
    } catch (refreshError) {
      console.warn('Session retrieval after MFA verify failed (non-fatal):', refreshError);
    }

    return { success: true, data: verifyData };
  },
};

