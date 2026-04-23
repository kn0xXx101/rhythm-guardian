import { supabase } from '@/lib/supabase';
import { averageRatingFromSumCount, fetchReviewAggregatesForReviewees } from '@/lib/review-ratings';
import { SearchFilters, SearchPreferences } from '@/types/features';

export const searchService = {
  async searchMusicians(filters: SearchFilters) {
    let query = supabase.from('profiles').select('*').eq('role', 'musician').eq('status', 'active');

    if (filters.instruments && filters.instruments.length > 0) {
      query = query.contains('instruments', filters.instruments);
    }

    if (filters.genres && filters.genres.length > 0) {
      query = query.contains('genres', filters.genres);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price_min', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price_max', filters.maxPrice);
    }

    if (filters.experienceLevel) {
      query = query.eq('experience_level', filters.experienceLevel);
    }

    if (filters.location) {
      query = query.ilike('city', `%${filters.location}%`);
    }

    if (filters.isFeatured) {
      query = query.eq('is_featured', true).gte('featured_until', new Date().toISOString());
    }

    if (filters.isVerified) {
      query = query.eq('identity_verified', true);
    }

    const { data, error } = await query
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const ids = rows.map((p: { user_id?: string }) => p.user_id).filter(Boolean) as string[];
    const { byRevieweeId, failed } = await fetchReviewAggregatesForReviewees(supabase, ids);

    let merged = rows.map((p: Record<string, unknown> & { user_id?: string }) => {
      const id = p.user_id;
      if (!id || failed) return p;
      const row = byRevieweeId[id];
      if (!row || row.count === 0) {
        return { ...p, rating: null, total_reviews: 0 };
      }
      return {
        ...p,
        rating: averageRatingFromSumCount(row.sum, row.count),
        total_reviews: row.count,
      };
    });

    if (filters.minRating !== undefined) {
      merged = merged.filter((p: any) => (Number(p.rating) || 0) >= filters.minRating!);
    }

    merged.sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

    return merged;
  },

  async saveSearchPreference(preference: Omit<SearchPreferences, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('musician_search_preferences')
      .insert(preference)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserSearchPreferences(userId: string) {
    const { data, error } = await supabase
      .from('musician_search_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async deleteSearchPreference(id: string) {
    const { error } = await supabase.from('musician_search_preferences').delete().eq('id', id);

    if (error) throw error;
  },

  async setDefaultPreference(id: string, userId: string) {
    await supabase
      .from('musician_search_preferences')
      .update({ is_default: false })
      .eq('user_id', userId);

    const { error } = await supabase
      .from('musician_search_preferences')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  async addToFavorites(musicianUserId: string, collectionName: string = 'default', notes?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        musician_user_id: musicianUserId,
        collection_name: collectionName,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeFromFavorites(musicianUserId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('musician_user_id', musicianUserId);

    if (error) throw error;
  },

  async getUserFavorites(userId: string) {
    const { data, error } = await supabase
      .from('favorites')
      .select(
        `
        *,
        profiles!favorites_musician_user_id_fkey(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async isMusicianFavorited(musicianUserId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('musician_user_id', musicianUserId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  async getFavoriteCollections(userId: string) {
    const { data, error } = await supabase
      .from('favorites')
      .select('collection_name')
      .eq('user_id', userId);

    if (error) throw error;

    const collections = [...new Set(data.map((f) => f.collection_name))];
    return collections;
  },
};
