import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'musician' | 'hirer';
  status: 'active' | 'pending' | 'suspended' | 'banned';
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  genres?: string[];
  instruments?: string[];
  hourlyRate?: number;
  basePrice?: number;
  priceMin?: number;
  priceMax?: number;
  pricingModel?: 'hourly' | 'fixed';
  availableDays?: string[];
  rating?: number;
  totalReviews?: number;
  totalBookings?: number;
  completionRate?: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

class UserService {
  /**
   * Get all users/profiles with optional filters
   */
  async getUsers(filters?: { role?: string; status?: string; search?: string }): Promise<UserProfile[]> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.role) {
        query = query.eq('role', filters.role as Database['public']['Enums']['user_role']);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status as Database['public']['Enums']['user_status']);
      }

      if (filters?.search) {
        // Search in full_name
        query = query.ilike('full_name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch emails from auth.users if available (requires admin access)
      // For now, we'll just map the profiles
      return (data || []).map(this.mapProfileToUserProfile);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get a single user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return this.mapProfileToUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map UserProfile fields to database fields
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.genres !== undefined) updateData.genres = updates.genres;
      if (updates.instruments !== undefined) updateData.instruments = updates.instruments;
      if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
      if (updates.pricingModel !== undefined) updateData.pricing_model = updates.pricingModel;
      if (updates.basePrice !== undefined) updateData.base_price = updates.basePrice;
      if (updates.availableDays !== undefined) updateData.available_days = updates.availableDays;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user status (admin operation)
   */
  async updateUserStatus(userId: string, status: 'active' | 'pending' | 'suspended' | 'banned'): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string, filters?: { role?: string; status?: string }): Promise<UserProfile[]> {
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,location.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters?.role) {
        dbQuery = dbQuery.eq('role', filters.role as Database['public']['Enums']['user_role']);
      }

      if (filters?.status) {
        dbQuery = dbQuery.eq('status', filters.status as Database['public']['Enums']['user_status']);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      return (data || []).map(this.mapProfileToUserProfile);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Map database profile to UserProfile interface
   */
  private mapProfileToUserProfile(profile: Profile): UserProfile {
    return {
      id: profile.user_id,
      userId: profile.user_id,
      fullName: profile.full_name,
      role: profile.role as 'admin' | 'musician' | 'hirer',
      status: profile.status as 'active' | 'pending' | 'suspended' | 'banned',
      emailVerified: profile.email_verified || false,
      phone: profile.phone || undefined,
      phoneVerified: profile.phone_verified || false,
      avatarUrl: profile.avatar_url || undefined,
      bio: profile.bio || undefined,
      location: profile.location || undefined,
      genres: profile.genres || undefined,
      instruments: profile.instruments || undefined,
      hourlyRate:
        (profile as any).hourly_rate !== null && (profile as any).hourly_rate !== undefined
          ? Number((profile as any).hourly_rate)
          : undefined,
      pricingModel:
        ((profile as any).pricing_model as 'hourly' | 'fixed') ||
        ((profile as any).base_price !== null && (profile as any).base_price !== undefined
          ? 'fixed'
          : (profile as any).hourly_rate !== null && (profile as any).hourly_rate !== undefined
            ? 'hourly'
            : undefined),
      basePrice:
        (profile as any).base_price !== null && (profile as any).base_price !== undefined
          ? Number((profile as any).base_price)
          : undefined,
      priceMin:
        (profile as any).price_min !== null && (profile as any).price_min !== undefined
          ? Number((profile as any).price_min)
          : undefined,
      priceMax:
        (profile as any).price_max !== null && (profile as any).price_max !== undefined
          ? Number((profile as any).price_max)
          : undefined,
      availableDays: profile.available_days || undefined,
      rating: profile.rating ? Number(profile.rating) : undefined,
      totalReviews: profile.total_reviews || undefined,
      totalBookings: profile.total_bookings || undefined,
      completionRate: profile.completion_rate ? Number(profile.completion_rate) : undefined,
      createdAt: profile.created_at || new Date().toISOString(),
      updatedAt: profile.updated_at || profile.created_at || new Date().toISOString(),
      lastActiveAt: profile.last_active_at || undefined,
    };
  }
}

export const userService = new UserService();
