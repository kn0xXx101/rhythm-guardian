import { supabase } from '@/lib/supabase';
import { Referral, LoyaltyPoints, Reward } from '@/types/features';

export const referralsService = {
  async createReferral(referredEmail: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const referralCode = `REF-${user.id.substring(0, 8)}-${Date.now()}`;

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referred_email: referredEmail,
        referral_code: referralCode,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return `${baseUrl}/signup?ref=${referralCode}`;
  },
};
