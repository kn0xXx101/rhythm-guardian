import { supabase } from '@/lib/supabase';
import { MusicianAvailability, AvailabilityPattern } from '@/types/features';

export const availabilityService = {
  async getAvailability(musicianUserId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('musician_availability')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as MusicianAvailability[];
  },

  async setAvailability(
    musicianUserId: string,
    date: string,
    status: 'available' | 'booked' | 'blocked',
    timeSlots?: any[],
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('musician_availability')
      .upsert(
        {
          musician_user_id: musicianUserId,
          date,
          status,
          time_slots: timeSlots || [],
          notes,
        },
        {
          onConflict: 'musician_user_id,date',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async bulkSetAvailability(
    musicianUserId: string,
    dates: string[],
    status: 'available' | 'blocked'
  ) {
    const records = dates.map((date) => ({
      musician_user_id: musicianUserId,
      date,
      status,
      time_slots: [],
    }));

    const { data, error } = await supabase
      .from('musician_availability')
      .upsert(records, { onConflict: 'musician_user_id,date' })
      .select();

    if (error) throw error;
    return data;
  },

  async getAvailabilityPatterns(musicianUserId: string) {
    const { data, error } = await supabase
      .from('availability_patterns')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data as AvailabilityPattern[];
  },

  async createAvailabilityPattern(pattern: Omit<AvailabilityPattern, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('availability_patterns')
      .insert(pattern)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAvailabilityPattern(id: string, updates: Partial<AvailabilityPattern>) {
    const { data, error } = await supabase
      .from('availability_patterns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAvailabilityPattern(id: string) {
    const { error } = await supabase.from('availability_patterns').delete().eq('id', id);

    if (error) throw error;
  },

  async checkAvailabilityForDate(musicianUserId: string, date: string) {
    const { data, error } = await supabase
      .from('musician_availability')
      .select('*')
      .eq('musician_user_id', musicianUserId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { available: true, status: 'unknown' };
    }

    return {
      available: data.status === 'available',
      status: data.status,
      timeSlots: data.time_slots,
    };
  },
};
