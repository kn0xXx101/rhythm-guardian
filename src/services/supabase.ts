import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type ProfileRow = Tables['profiles']['Row'];

export const supabaseService = {
  // User Profile methods
  async createUserProfile(profile: Tables['profiles']['Insert']) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, profile: Partial<ProfileRow>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Booking methods
  async createBooking(booking: Tables['bookings']['Insert']) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`hirer_id.eq.${userId},musician_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateBooking(bookingId: string, updates: Partial<Tables['bookings']['Update']>) {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Message methods
  async sendMessage(message: Tables['messages']['Insert']) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select('id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, created_at, updated_at')
      .single();
    if (error) throw error;
    return data;
  },

  async getMessages(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, created_at, updated_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async markMessageAsRead(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
    if (error) throw error;
  },

  // Review methods
  async createReview(review: Tables['reviews']['Insert']) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getReviews(userId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async respondToReview(reviewId: string, response: string) {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        response,
        response_date: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Settings methods
  async getUserSettings(userId: string) {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateUserSettings(userId: string, settings: Partial<Tables['settings']['Update']>) {
    const { data, error } = await supabase
      .from('settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Realtime subscriptions
  subscribeToMessages(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToBookings(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `or(hirer_id.eq.${userId},musician_id.eq.${userId})`,
        },
        callback
      )
      .subscribe();
  },
};
