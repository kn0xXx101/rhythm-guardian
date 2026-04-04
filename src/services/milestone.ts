import { supabase } from '@/lib/supabase';

export interface Milestone {
  id: string;
  booking_id: string;
  milestone_number: number;
  title: string;
  description: string | null;
  amount: number;
  percentage: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'released' | 'cancelled';
  paid_at: string | null;
  released_at: string | null;
  paystack_reference: string | null;
  transaction_id: string | null;
}

export interface MilestoneProgress {
  booking_id: string;
  musician_name: string;
  hirer_name: string;
  event_type: string;
  total_amount: number;
  has_milestones: boolean;
  milestones_count: number;
  milestones_paid_count: number;
  milestones_released_count: number;
  payment_progress_percentage: number;
  release_progress_percentage: number;
  milestones: Milestone[];
}

export const milestoneService = {
  /**
   * Create default milestones for a booking
   */
  async createDefaultMilestones(bookingId: string, milestoneCount: number = 3) {
    try {
      const { error } = await supabase.rpc('create_default_milestones' as any, {
        p_booking_id: bookingId,
        p_milestone_count: milestoneCount,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error creating default milestones:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create custom milestones
   */
  async createCustomMilestones(
    bookingId: string,
    milestones: Array<{
      title: string;
      description?: string;
      percentage: number;
      dueDate?: string;
    }>
  ) {
    try {
      // Validate percentages add up to 100
      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
      if (totalPercentage !== 100) {
        return { success: false, error: 'Milestone percentages must add up to 100%' };
      }

      // Get booking total amount
      const { data: booking } = await supabase
        .from('bookings' as any)
        .select('total_amount')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      // Create milestones
      const milestonesToInsert = milestones.map((m, index) => ({
        booking_id: bookingId,
        milestone_number: index + 1,
        title: m.title,
        description: m.description,
        amount: (booking.total_amount * m.percentage) / 100,
        percentage: m.percentage,
        due_date: m.dueDate,
      }));

      const { error } = await supabase
        .from('payment_milestones' as any)
        .insert(milestonesToInsert);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error creating custom milestones:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get milestones for a booking
   */
  async getMilestones(bookingId: string): Promise<Milestone[]> {
    try {
      const { data, error } = await supabase
        .from('payment_milestones' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('milestone_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }
  },

  /**
   * Get milestone progress for a booking
   */
  async getMilestoneProgress(bookingId: string): Promise<MilestoneProgress | null> {
    try {
      const { data, error } = await supabase
        .from('milestone_progress' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching milestone progress:', error);
      return null;
    }
  },

  /**
   * Record milestone payment
   */
  async recordMilestonePayment(params: {
    milestoneId: string;
    transactionId: string;
    paystackReference: string;
  }) {
    try {
      const { error } = await supabase
        .from('payment_milestones' as any)
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: params.transactionId,
          paystack_reference: params.paystackReference,
        })
        .eq('id', params.milestoneId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error recording milestone payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Release milestone payout
   */
  async releaseMilestonePayout(milestoneId: string) {
    try {
      const { error } = await supabase
        .from('payment_milestones' as any)
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error releasing milestone payout:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update milestone
   */
  async updateMilestone(
    milestoneId: string,
    updates: {
      title?: string;
      description?: string;
      dueDate?: string;
    }
  ) {
    try {
      const { error } = await supabase
        .from('payment_milestones' as any)
        .update({
          title: updates.title,
          description: updates.description,
          due_date: updates.dueDate,
        })
        .eq('id', milestoneId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete milestone
   */
  async deleteMilestone(milestoneId: string) {
    try {
      const { error } = await supabase
        .from('payment_milestones' as any)
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting milestone:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get next due milestone
   */
  async getNextDueMilestone(bookingId: string): Promise<Milestone | null> {
    try {
      const { data, error } = await supabase
        .from('payment_milestones' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'pending')
        .order('milestone_number', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching next due milestone:', error);
      return null;
    }
  },

  /**
   * Validate milestone percentages
   */
  async validateMilestonePercentages(bookingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('validate_milestone_percentages' as any, {
        p_booking_id: bookingId,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error('Error validating milestone percentages:', error);
      return false;
    }
  },

  /**
   * Get all bookings with milestones
   */
  async getAllMilestoneBookings(): Promise<MilestoneProgress[]> {
    try {
      const { data, error } = await supabase
        .from('milestone_progress' as any)
        .select('*')
        .order('booking_id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching milestone bookings:', error);
      return [];
    }
  },
};
