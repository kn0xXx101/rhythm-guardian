import { supabase } from '@/lib/supabase';

export interface Transaction {
  id: string;
  booking_id?: string;
  user_id: string;
  type: 'booking_payment' | 'refund' | 'platform_fee' | 'payout';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  paystack_reference?: string;
  paystack_access_code?: string;
  paystack_authorization?: any;
  description?: string;
  metadata?: any;
  currency: string;
  platform_fee: number;
  net_amount?: number;
  refund_amount: number;
  refunded_at?: string;
  ip_address?: string;
  channel?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  total_paid: number;
  total_received: number;
  total_refunded: number;
  total_fees: number;
  transaction_count: number;
}

export const transactionsService = {
  /**
   * Get user transactions
   */
  async getUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Get booking transactions
   */
  async getBookingTransactions(bookingId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  /**
   * Get transaction by Paystack reference
   */
  async getTransactionByReference(reference: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (error) throw error;
    return data as Transaction | null;
  },

  /**
   * Get user transaction summary
   */
  async getUserTransactionSummary(userId: string): Promise<TransactionSummary> {
    const { data, error } = await supabase.rpc('get_user_transaction_summary', {
      user_uuid: userId
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0] as TransactionSummary;
    }

    return {
      total_paid: 0,
      total_received: 0,
      total_refunded: 0,
      total_fees: 0,
      transaction_count: 0
    };
  },

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Get pending transactions
   */
  async getPendingTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Get transactions by type
   */
  async getTransactionsByType(
    userId: string,
    type: Transaction['type']
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Request refund
   */
  async requestRefund(transactionId: string, reason: string): Promise<Transaction> {
    const transaction = await this.getTransaction(transactionId);

    if (transaction.status !== 'paid') {
      throw new Error('Only paid transactions can be refunded');
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        booking_id: transaction.booking_id,
        user_id: transaction.user_id,
        type: 'refund',
        amount: transaction.amount,
        status: 'pending',
        currency: transaction.currency,
        description: `Refund for transaction ${transactionId}: ${reason}`,
        metadata: {
          original_transaction_id: transactionId,
          reason
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  /**
   * Get transaction status badge color
   */
  getStatusColor(status: Transaction['status']): string {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  /**
   * Get transaction type label
   */
  getTypeLabel(type: Transaction['type']): string {
    switch (type) {
      case 'booking_payment':
        return 'Booking Payment';
      case 'refund':
        return 'Refund';
      case 'platform_fee':
        return 'Platform Fee';
      case 'payout':
        return 'Payout';
      default:
        return type;
    }
  },

  /**
   * Format transaction amount
   */
  formatAmount(amount: number, currency: string = 'GHS'): string {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  /**
   * Calculate total earnings for musician
   */
  async getMusicianEarnings(musicianId: string): Promise<{
    totalEarnings: number;
    totalFees: number;
    netEarnings: number;
    pendingPayouts: number;
  }> {
    const transactions = await this.getUserTransactions(musicianId);

    const bookingPayments = transactions.filter(t => t.type === 'booking_payment' && t.status === 'paid');
    const payouts = transactions.filter(t => t.type === 'payout' && t.status === 'paid');
    const pendingPayouts = transactions.filter(t => t.type === 'payout' && t.status === 'pending');

    const totalEarnings = bookingPayments.reduce((sum, t) => sum + t.amount, 0);
    const totalFees = bookingPayments.reduce((sum, t) => sum + t.platform_fee, 0);
    const netEarnings = totalEarnings - totalFees;
    const pendingPayoutsAmount = pendingPayouts.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalEarnings,
      totalFees,
      netEarnings,
      pendingPayouts: pendingPayoutsAmount
    };
  },

  /**
   * Get transaction analytics
   */
  async getTransactionAnalytics(startDate?: string, endDate?: string) {
    let query = supabase
      .from('transaction_analytics')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query.limit(30);

    if (error) throw error;
    return data;
  }
};
