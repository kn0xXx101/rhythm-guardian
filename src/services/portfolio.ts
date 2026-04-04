import { supabase } from '@/lib/supabase';
import { PortfolioItem } from '@/types/features';

export const portfolioService = {
  async getPortfolioItems(musicianUserId: string) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PortfolioItem[];
  },

  async createPortfolioItem(item: Omit<PortfolioItem, 'id' | 'created_at' | 'views'>) {
    const { data, error } = await supabase.from('portfolio_items').insert(item).select().single();

    if (error) throw error;
    return data;
  },

  async updatePortfolioItem(id: string, updates: Partial<PortfolioItem>) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePortfolioItem(id: string) {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id);

    if (error) throw error;
  },

  async reorderPortfolioItems(items: { id: string; display_order: number }[]) {
    const updates = items.map((item) =>
      supabase
        .from('portfolio_items')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
    );

    await Promise.all(updates);
  },

  async incrementViews(id: string) {
    const { error } = await supabase.rpc('increment_portfolio_views', { portfolio_id: id });

    if (error) {
      const { data: current } = await supabase
        .from('portfolio_items')
        .select('views')
        .eq('id', id)
        .single();

      if (current) {
        await supabase
          .from('portfolio_items')
          .update({ views: (current.views || 0) + 1 })
          .eq('id', id);
      }
    }
  },

  async uploadToStorage(file: File, path: string) {
    const { data, error } = await supabase.storage.from('portfolio').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('portfolio').getPublicUrl(data.path);

    return publicUrl;
  },

  async deleteFromStorage(url: string) {
    const path = url.split('/portfolio/')[1];
    if (!path) return;

    const { error } = await supabase.storage.from('portfolio').remove([path]);

    if (error) throw error;
  },
};
