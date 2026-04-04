import { supabase } from '@/lib/supabase';
import { PricingPackage, PackageAddon } from '@/types/features';

export const packagesService = {
  async getMusicianPackages(musicianUserId: string) {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as PricingPackage[];
  },

  async getPackageById(id: string) {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as PricingPackage;
  },

  async createPackage(pkg: Omit<PricingPackage, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('pricing_packages').insert(pkg).select().single();

    if (error) throw error;
    return data;
  },

  async updatePackage(id: string, updates: Partial<PricingPackage>) {
    const { data, error } = await supabase
      .from('pricing_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePackage(id: string) {
    const { error } = await supabase
      .from('pricing_packages')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async getMusicianAddons(musicianUserId: string) {
    const { data, error } = await supabase
      .from('package_addons')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PackageAddon[];
  },

  async createAddon(addon: Omit<PackageAddon, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('package_addons').insert(addon).select().single();

    if (error) throw error;
    return data;
  },

  async updateAddon(id: string, updates: Partial<PackageAddon>) {
    const { data, error } = await supabase
      .from('package_addons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAddon(id: string) {
    const { error } = await supabase
      .from('package_addons')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  getTierColor(tier: string) {
    switch (tier) {
      case 'bronze':
        return 'text-amber-600';
      case 'silver':
        return 'text-gray-400';
      case 'gold':
        return 'text-yellow-500';
      case 'custom':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  },

  getTierIcon(tier: string) {
    switch (tier) {
      case 'bronze':
        return '🥉';
      case 'silver':
        return '🥈';
      case 'gold':
        return '🥇';
      case 'custom':
        return '⭐';
      default:
        return '📦';
    }
  },
};
