import { supabase } from '@/lib/supabase';

export interface DailyAnalytics {
  date: string;
  total_bookings: number;
  total_revenue: number;
  platform_fees: number;
  musician_payouts: number;
  completed_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  refunded_amount: number;
  refund_count: number;
  average_booking_value: number;
  new_users: number;
  active_musicians: number;
  active_hirers: number;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_platform_fees: number;
  total_payouts: number;
  total_bookings: number;
  paid_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  avg_booking_value: number;
  bookings_last_7_days: number;
  bookings_last_30_days: number;
  revenue_last_7_days: number;
  revenue_last_30_days: number;
}

export const analyticsService = {
  /**
   * Get daily analytics for a date range
   */
  async getDailyAnalytics(startDate: string, endDate: string): Promise<DailyAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('payment_analytics' as any)
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching daily analytics:', error);
      return [];
    }
  },

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
    try {
      const { data, error } = await supabase
        .from('analytics_summary' as any)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      return null;
    }
  },

  /**
   * Calculate analytics for a specific date
   */
  async calculateDailyAnalytics(date: string) {
    try {
      const { error } = await supabase.rpc('calculate_daily_analytics' as any, {
        target_date: date,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error calculating daily analytics:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Refresh analytics summary
   */
  async refreshAnalyticsSummary() {
    try {
      const { error } = await supabase.rpc('refresh_analytics_summary' as any);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error refreshing analytics summary:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get revenue trend data
   */
  async getRevenueTrend(days: number = 30) {
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] as string;

    const analytics = await this.getDailyAnalytics(startDate, endDate);

    return analytics.map((day) => ({
      date: day.date,
      revenue: day.total_revenue,
      platformFees: day.platform_fees,
      payouts: day.musician_payouts,
    }));
  },

  /**
   * Get booking trend data
   */
  async getBookingTrend(days: number = 30) {
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] as string;

    const analytics = await this.getDailyAnalytics(startDate, endDate);

    return analytics.map((day) => ({
      date: day.date,
      bookings: day.total_bookings,
      avgValue: day.average_booking_value,
    }));
  },

  /**
   * Get transaction metrics
   */
  async getTransactionMetrics(days: number = 30) {
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] as string;

    const analytics = await this.getDailyAnalytics(startDate, endDate);

    const totals = analytics.reduce(
      (acc, day) => ({
        completed: acc.completed + day.completed_transactions,
        pending: acc.pending + day.pending_transactions,
        failed: acc.failed + day.failed_transactions,
      }),
      { completed: 0, pending: 0, failed: 0 }
    );

    return totals;
  },

  /**
   * Get refund metrics
   */
  async getRefundMetrics(days: number = 30) {
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] as string;

    const analytics = await this.getDailyAnalytics(startDate, endDate);

    const totals = analytics.reduce(
      (acc, day) => ({
        amount: acc.amount + day.refunded_amount,
        count: acc.count + day.refund_count,
      }),
      { amount: 0, count: 0 }
    );

    return totals;
  },

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(days: number = 30) {
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] as string;

    const analytics = await this.getDailyAnalytics(startDate, endDate);

    return analytics.map((day) => ({
      date: day.date,
      newUsers: day.new_users,
      activeMusicians: day.active_musicians,
      activeHirers: day.active_hirers,
    }));
  },

  /**
   * Get top musicians by earnings
   */
  async getTopMusiciansByEarnings(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('bookings' as any)
        .select('musician_id, musician_name, total_amount')
        .eq('payment_status', 'paid')
        .eq('payout_released', true);

      if (error) throw error;

      // Aggregate by musician
      const musicianEarnings = (data || []).reduce((acc: any, booking: any) => {
        const musicianId = booking.musician_id;
        if (!acc[musicianId]) {
          acc[musicianId] = {
            musician_id: musicianId,
            musician_name: booking.musician_name,
            total_earnings: 0,
            booking_count: 0,
          };
        }
        acc[musicianId].total_earnings += booking.total_amount * 0.9; // 90% to musician
        acc[musicianId].booking_count += 1;
        return acc;
      }, {});

      // Convert to array and sort
      return Object.values(musicianEarnings)
        .sort((a: any, b: any) => b.total_earnings - a.total_earnings)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top musicians:', error);
      return [];
    }
  },

  /**
   * Get payment method breakdown
   */
  async getPaymentMethodBreakdown() {
    try {
      const { data, error } = await supabase
        .from('transactions' as any)
        .select('payment_method, amount')
        .eq('status', 'completed');

      if (error) throw error;

      // Aggregate by payment method
      const breakdown = (data || []).reduce((acc: any, tx: any) => {
        const method = tx.payment_method || 'unknown';
        if (!acc[method]) {
          acc[method] = { method, count: 0, total: 0 };
        }
        acc[method].count += 1;
        acc[method].total += tx.amount;
        return acc;
      }, {});

      return Object.values(breakdown);
    } catch (error) {
      console.error('Error fetching payment method breakdown:', error);
      return [];
    }
  },
};
