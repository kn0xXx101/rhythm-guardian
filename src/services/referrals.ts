import { supabase } from '@/lib/supabase';
import { Referral, LoyaltyPoints, Reward } from '@/types/features';

/** Stored when user opens /signup?ref=... and consumed after email verification on /auth/email-confirmed */
export const PENDING_REFERRAL_STORAGE_KEY = 'rg_pending_referral_code';

const SHARE_EMAIL_DOMAIN = 'referrals.rhythm-guardian.local';

function sharePlaceholderEmail(userId: string): string {
  return `share+${userId}@${SHARE_EMAIL_DOMAIN}`;
}

/** Link-only referral rows use this placeholder email — hide from “Your referrals” list. */
export function isSharePlaceholderEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.endsWith(`@${SHARE_EMAIL_DOMAIN}`);
}

export const referralsService = {
  /**
   * Ensures the user has a stable share link (one “link-only” referral row per account).
   */
  async ensureShareReferralCode(userId: string): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');

    const placeholder = sharePlaceholderEmail(userId);

    const { data: existing, error: selErr } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', userId)
      .eq('referred_email', placeholder)
      .maybeSingle();

    if (selErr) throw selErr;
    if (existing?.referral_code) return existing.referral_code;

    const referralCode = `RG-${userId.replace(/-/g, '').slice(0, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const { data: created, error: insErr } = await supabase
      .from('referrals')
      .insert({
        referrer_id: userId,
        referred_email: placeholder,
        referral_code: referralCode,
        status: 'pending',
      })
      .select('referral_code')
      .single();

    if (insErr) throw insErr;
    return created!.referral_code as string;
  },

  async createReferral(referredEmail: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const normalized = referredEmail.trim().toLowerCase();
    if (!normalized) throw new Error('Email required');

    const referralCode = `INV-${user.id.substring(0, 8)}-${Date.now().toString(36)}`.toUpperCase();

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referred_email: normalized,
        referral_code: referralCode,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeReferralSignup(referralCode: string, newUserId: string, email: string) {
    const code = referralCode.trim();
    if (!code) return { ok: false as const, error: 'missing_code' };

    const { data, error } = await supabase.rpc('complete_referral_signup', {
      p_referral_code: code,
      p_new_user_id: newUserId,
      p_email: email,
    });

    if (error) throw error;

    const payload = data as { ok?: boolean; error?: string } | null;
    return payload ?? { ok: false, error: 'unknown' };
  },

  async getUserReferrals(userId: string) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Referral[];
  },

  async getUserLoyaltyPoints(userId: string) {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as LoyaltyPoints[];
  },

  async getTotalPoints(userId: string) {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('user_id', userId);

    if (error) throw error;

    const total = data.reduce((sum, item) => sum + item.points, 0);
    return total;
  },

  async getAvailableRewards() {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (error) throw error;
    return data as Reward[];
  },

  async redeemReward(rewardId: string, userId: string) {
    const reward = await supabase.from('rewards').select('*').eq('id', rewardId).single();

    if (reward.error) throw reward.error;

    const totalPoints = await this.getTotalPoints(userId);

    if (totalPoints < reward.data.points_required) {
      throw new Error('Insufficient points');
    }

    const { data, error } = await supabase
      .from('loyalty_points')
      .insert({
        user_id: userId,
        points: -reward.data.points_required,
        reason: `Redeemed: ${reward.data.name}`,
        reference_type: 'reward',
        reference_id: rewardId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  generateReferralLink(referralCode: string) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?ref=${encodeURIComponent(referralCode)}`;
  },
};
