import { supabaseAdmin } from '@/lib/supabase';
import { SessionManager } from '@/utils/session-manager';

interface User {
  id: string;
  name: string;
  email: string;
  userType: 'hirer' | 'musician';
  status: 'active' | 'suspended' | 'banned' | 'pending';
  verified: boolean;
  joinDate: string;
  lastActive: string;
  profileComplete: boolean;
  documentsSubmitted: boolean;
  documentsVerified: boolean;
  completionPercentage: number;
}

class AdminService {
  async getDashboardData() {
    try {
      const [
        { count: userCount },
        { count: pendingCount },
        { data: messages },
        { data: bookings }
      ] = (await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('role', 'eq', 'admin'),
        supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .not('role', 'eq', 'admin'),
        (supabaseAdmin as any)
          .from('messages')
          .select('id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, created_at, updated_at, sender:profiles(full_name)')
          .eq('flagged', true)
          .order('created_at', { ascending: false })
          .limit(5),
        (supabaseAdmin as any)
          .from('bookings')
          .select('*, hirer:profiles(full_name), musician:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(5)
      ])) as any;

      const totalRevenue = (bookings || []).reduce(
        (sum: number, booking: any) => sum + (booking.total_amount || 0),
        0
      );


      const recentActivity = [
        ...(messages || []).map((msg: any) => ({
          id: msg.id,
          action: 'Chat Flagged',
          description: `Message from ${msg.sender?.full_name} was flagged`,
          time: new Date(msg.created_at).toLocaleString(),
          type: 'flag'
        })),
        ...(bookings || []).map((booking: any) => ({
          id: booking.id,
          action: 'New Booking',
          description: `${booking.hirer?.full_name} booked ${booking.musician?.full_name}`,
          time: new Date(booking.created_at).toLocaleString(),
          type: 'booking'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
       .slice(0, 5);

      return {
        userCount: userCount || 0,
        pendingUsers: pendingCount || 0,
        disputeCount: 0, // Disputes table not implemented yet
        totalRevenue,
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  async getOverviewStats() {
    try {
      // Check session before making requests
      const session = await SessionManager.getValidSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables not configured');
      }

      const url = `${supabaseUrl}/functions/v1/admin-users/overview`;

      let response: Response | null = null;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError) {
        console.warn('Edge function fetch failed, falling back to direct queries:', fetchError);
      }

      if (response && response.ok) {
        return await response.json();
      }

      const { data: profileStats, error: profileStatsError } = await supabaseAdmin
        .from('profiles')
        .select('role, status, documents_verified, profile_completion_percentage');

      if (profileStatsError) throw profileStatsError;

      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select('status, total_amount, payment_status, payout_released');

      if (bookingsError) throw bookingsError;

      const profiles = profileStats || [];
      const bookingsList = bookings || [];

      const totalHirers = profiles.filter((p: any) => p.role === 'hirer').length;
      const totalMusicians = profiles.filter((p: any) => p.role === 'musician').length;
      const verifiedMusicians = profiles.filter(
        (p: any) => p.role === 'musician' && p.documents_verified === true
      ).length;
      const completionValues = profiles
        .filter((p: any) => p.profile_completion_percentage !== null && p.profile_completion_percentage !== undefined)
        .map((p: any) => Number(p.profile_completion_percentage));
      const averageProfileCompletion =
        completionValues.length > 0
          ? completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length
          : 0;

      const countByStatus = (statusList: string[]) =>
        bookingsList.filter((b: any) => statusList.includes(b.status)).length;

      const sumAmounts = (filterFn: (b: any) => boolean) =>
        bookingsList
          .filter(filterFn)
          .reduce(
            (sum: number, booking: any) =>
              sum + Number(booking.total_amount ?? 0),
            0
          );

      const totalBookings = bookingsList.length;
      const pendingBookings = countByStatus(['pending']);
      const confirmedBookings = countByStatus(['in_progress', 'accepted']);
      const completedBookings = countByStatus(['completed']);
      const cancelledBookings = countByStatus(['cancelled', 'rejected']);

      const totalSpent = sumAmounts((b) => b.payment_status === 'paid');
      
      // Calculate musician earnings using admin-configured platform commission rate
      let platformCommissionRate = 10; // Default fallback
      try {
        const { data: settings } = await supabaseAdmin
          .from('platform_settings')
          .select('key, value')
          .in('key', ['booking', 'payment'])
          .limit(2);
        
        // Check booking settings first (new structure)
        const bookingSetting = settings?.find((s: any) => s.key === 'booking');
        if (bookingSetting?.value) {
          const bookingValue = bookingSetting.value as any;
          if (bookingValue.platformCommissionRate !== undefined) {
            platformCommissionRate = Number(bookingValue.platformCommissionRate);
          }
        }
        
        // Fallback to payment settings (old structure) if not found
        if (platformCommissionRate === 10) {
          const paymentSetting = settings?.find((s: any) => s.key === 'payment');
          if (paymentSetting?.value) {
            const paymentValue = paymentSetting.value as any;
            if (paymentValue.platform_fee_percentage !== undefined) {
              platformCommissionRate = Number(paymentValue.platform_fee_percentage);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch platform commission rate for overview stats, using default:', error);
      }

      // Calculate total musician earnings after platform fees
      const paidBookings = bookingsList.filter((b: any) => b.payment_status === 'paid');
      const totalEarned = paidBookings.reduce((sum: number, booking: any) => {
        const totalAmount = Number(booking.total_amount ?? 0);
        const platformFee = totalAmount * (platformCommissionRate / 100);
        const paystackFee = (totalAmount * 0.015) + 0.50; // 1.5% + GHS 0.50
        const musicianReceives = totalAmount - platformFee - paystackFee;
        return sum + Math.max(0, musicianReceives); // Ensure non-negative
      }, 0);

      // Calculate pending payouts (amount musicians will receive, not total booking amount)
      const pendingPayoutBookings = bookingsList.filter(
        (b: any) => b.payment_status === 'paid' && b.payout_released !== true
      );
      const pendingPayouts = pendingPayoutBookings.reduce((sum: number, booking: any) => {
        const totalAmount = Number(booking.total_amount ?? 0);
        const platformFee = totalAmount * (platformCommissionRate / 100);
        const paystackFee = (totalAmount * 0.015) + 0.50; // 1.5% + GHS 0.50
        const musicianReceives = totalAmount - platformFee - paystackFee;
        return sum + Math.max(0, musicianReceives); // Ensure non-negative
      }, 0);

      return {
        hirerStats: {
          totalHirers,
          totalBookings,
          pendingBookings,
          confirmedBookings,
          completedBookings,
          cancelledBookings,
          totalSpent,
        },
        musicianStats: {
          totalMusicians,
          totalBookings,
          completedBookings,
          pendingBookings,
          totalEarned,
          pendingPayouts,
          verifiedMusicians,
          averageProfileCompletion,
        },
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      throw error;
    }
  }

  async getUsers(filters?: { status?: string; role?: string; search?: string }): Promise<User[]> {
    try {

      // Try direct database query first (fallback approach)
      try {
        let query = supabaseAdmin
          .from('profiles')
          .select(`
            user_id,
            full_name,
            email,
            role,
            status,
            email_verified,
            documents_submitted,
            documents_verified,
            profile_completion_percentage,
            last_active_at,
            created_at,
            updated_at
          `)
          .not('role', 'eq', 'admin');

        // Apply filters
        if (filters?.status) {
          query = query.eq('status', filters.status as 'active' | 'suspended' | 'banned' | 'pending');
        }
        if (filters?.role) {
          query = query.eq('role', filters.role as 'hirer' | 'musician' | 'admin');
        }
        if (filters?.search) {
          query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        const { data: profiles, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const users: User[] = (profiles || []).map((profile: any) => ({
          id: profile.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email || 'No email',
          userType: (profile.role as 'hirer' | 'musician') || 'hirer',
          status: (profile.status as 'active' | 'suspended' | 'banned' | 'pending') || 'pending',
          verified: profile.email_verified || false,
          joinDate: new Date(profile.created_at).toLocaleDateString(),
          lastActive: profile.last_active_at 
            ? new Date(profile.last_active_at).toLocaleDateString() 
            : new Date(profile.updated_at || profile.created_at).toLocaleDateString(),
          profileComplete: (profile.profile_completion_percentage || 0) >= 80,
          documentsSubmitted: profile.documents_submitted || false,
          documentsVerified: profile.documents_verified || false,
          completionPercentage: profile.profile_completion_percentage || 0,
        }));

        return users;

      } catch (directQueryError) {
        console.warn('Direct query failed, trying edge function:', directQueryError);
        
        // Fallback to edge function (original code)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl) {
          throw new Error('VITE_SUPABASE_URL is not configured. Please check your environment variables.');
        }

        if (!supabaseAnonKey) {
          throw new Error('VITE_SUPABASE_ANON_KEY is not configured. Please check your environment variables.');
        }

        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.role) params.append('role', filters.role);
        if (filters?.search) params.append('search', filters.search);

        const url = `${supabaseUrl}/functions/v1/admin-users${params.toString() ? '?' + params.toString() : ''}`;

        const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
        if (sessionError || !session) {
          throw new Error('No active session. Please log in again.');
        }

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
          });
        } catch (fetchError) {
          // Network error (fetch failed)
          throw new Error(
            'Database error finding users: Unregistered API key (code: undefined). ' +
            'Fallback query also failed: Unregistered API key'
          );
        }

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to fetch users`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            
            if (response.status === 404) {
              errorMessage = 'Admin-users edge function not found. Please deploy it using: supabase functions deploy admin-users';
            } else if (response.status === 401) {
              errorMessage = 'Authentication failed. Please log in again.';
            } else if (response.status === 403) {
              errorMessage = 'Access denied. Admin privileges required.';
            }
          } catch {
            // If response body is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const users = data.users || [];

        return users;
      }
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch users');
    }
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned' | 'pending'): Promise<boolean> {
    try {
      // Try direct database update first (fallback approach)
      try {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ status })
          .eq('user_id', userId);

        if (error) throw error;

        return true;

      } catch (directQueryError) {
        console.warn('Direct query failed, trying edge function:', directQueryError);
        
        // Fallback to edge function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase environment variables not configured');
        }

        const url = `${supabaseUrl}/functions/v1/admin-users/${userId}/status`;

        const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
        if (sessionError || !session) {
          throw new Error('No active session. Please log in again.');
        }

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
          });
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
          if (errorMessage.includes('fetch')) {
            throw new Error('Failed to connect to server. The admin-users edge function may not be deployed.');
          }
          throw fetchError;
        }

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to update user status`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        return true;
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async verifyUser(userId: string): Promise<boolean> {
    try {
      // Try direct database update first (fallback approach)
      try {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            email_verified: true,
            documents_verified: true 
          })
          .eq('user_id', userId);

        if (error) throw error;

        return true;

      } catch (directQueryError) {
        console.warn('Direct query failed, trying edge function:', directQueryError);
        
        // Fallback to edge function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase environment variables not configured');
        }

        const url = `${supabaseUrl}/functions/v1/admin-users/${userId}/verify`;

        const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
        if (sessionError || !session) {
          throw new Error('No active session. Please log in again.');
        }

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
          });
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
          if (errorMessage.includes('fetch')) {
            throw new Error('Failed to connect to server. The admin-users edge function may not be deployed.');
          }
          throw fetchError;
        }

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to verify user`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        return true;
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const session = await SessionManager.getValidSession();
    if (!session) throw new Error('No active session. Please log in again.');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables not configured');

    const url = `${supabaseUrl}/functions/v1/admin-users/${userId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: Failed to delete user`);
    }
    return true;
  }

  async deleteAllUsers(): Promise<{ deleted: number }> {
    const session = await SessionManager.getValidSession();
    if (!session) throw new Error('No active session. Please log in again.');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables not configured');

    const url = `${supabaseUrl}/functions/v1/admin-users/purge`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: 'DELETE_ALL_USERS' }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: Failed to delete users`);
    }
    return await res.json();
  }

  async deleteBooking(bookingId: string): Promise<boolean> {
    const session = await SessionManager.getValidSession();
    if (!session) throw new Error('No active session. Please log in again.');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables not configured');

    const url = `${supabaseUrl}/functions/v1/admin-users/bookings/${bookingId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: Failed to delete booking`);
    }
    return true;
  }

  async deleteAllBookings(): Promise<boolean> {
    const session = await SessionManager.getValidSession();
    if (!session) throw new Error('No active session. Please log in again.');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables not configured');

    const url = `${supabaseUrl}/functions/v1/admin-users/bookings/purge`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: 'DELETE_ALL_BOOKINGS' }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: Failed to delete bookings`);
    }
    return true;
  }

  // Analytics Methods
  async getAnalyticsData(dateRange: { start: string; end: string } | null = null) {
    try {
      const now = new Date();
      const startDate = dateRange?.start || new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
      const endDate = dateRange?.end || now.toISOString();

      // Fetch all data in parallel
      const [
        { data: bookings },
        { data: profiles },
        { data: transactions },
        { data: reviews }
      ] = await Promise.all([
        supabaseAdmin
          .from('bookings')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabaseAdmin
          .from('profiles')
          .select('*')
          .not('role', 'eq', 'admin')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabaseAdmin
          .from('transactions')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabaseAdmin
          .from('reviews')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      ]);

      return {
        bookings: bookings || [],
        profiles: profiles || [],
        transactions: transactions || [],
        reviews: reviews || []
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  async getRevenueAnalytics(dateRange: { start: string; end: string } | null = null) {
    try {
      const data = await this.getAnalyticsData(dateRange);

      const paidBookingRows = (data.bookings || []).filter(
        (b: any) => b.payment_status === 'paid'
      );

      // Gross booking value and fees only from paid bookings (consistent with charts)
      const totalRevenue = paidBookingRows.reduce(
        (sum: number, b: any) => sum + (parseFloat(String(b.total_amount ?? '0')) || 0),
        0
      );
      const platformFees = paidBookingRows.reduce(
        (sum: number, b: any) => sum + (parseFloat(String(b.platform_fee ?? '0')) || 0),
        0
      );
      const paidBookings = paidBookingRows.length;
      const completedBookings = (data.bookings || []).filter(b => b.status === 'completed').length;
      
      // Revenue by month
      const revenueByMonth = this.groupByMonth(
        data.bookings.filter(b => b.payment_status === 'paid'),
        'created_at',
        (b) => parseFloat(b.total_amount || '0') || 0
      );

      // Revenue by event type
      const revenueByEventType = this.groupByField(
        data.bookings.filter(b => b.payment_status === 'paid'),
        'event_type',
        (b) => parseFloat(b.total_amount || '0') || 0
      );

      return {
        totalRevenue,
        platformFees,
        paidBookings,
        completedBookings,
        revenueByMonth,
        revenueByEventType,
        averageBookingValue: paidBookings > 0 ? totalRevenue / paidBookings : 0
      };
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  async getUserGrowthAnalytics(dateRange: { start: string; end: string } | null = null) {
    try {
      const data = await this.getAnalyticsData(dateRange);
      
      const totalUsers = data.profiles.length;
      const musicians = data.profiles.filter(p => p.role === 'musician').length;
      const hirers = data.profiles.filter(p => p.role === 'hirer').length;
      const activeUsers = data.profiles.filter(p => p.status === 'active').length;
      const verifiedUsers = data.profiles.filter(p => p.email_verified).length;

      // User growth by month
      const userGrowthByMonth = this.groupByMonth(
        data.profiles,
        'created_at',
        () => 1,
        true // cumulative
      );

      // Users by role
      const usersByRole = {
        musician: musicians,
        hirer: hirers
      };

      // Users by status
      const usersByStatus = this.groupByField(
        data.profiles,
        'status',
        () => 1
      );

      return {
        totalUsers,
        musicians,
        hirers,
        activeUsers,
        verifiedUsers,
        userGrowthByMonth,
        usersByRole,
        usersByStatus,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0
      };
    } catch (error) {
      console.error('Error fetching user growth analytics:', error);
      throw error;
    }
  }

  async getBookingAnalytics(dateRange: { start: string; end: string } | null = null) {
    try {
      const data = await this.getAnalyticsData(dateRange);
      
      const totalBookings = data.bookings.length;
      const pendingBookings = data.bookings.filter(b => b.status === 'pending').length;
      const acceptedBookings = data.bookings.filter(b => b.status === 'accepted').length;
      const completedBookings = data.bookings.filter(b => b.status === 'completed').length;
      const cancelledBookings = data.bookings.filter(b => b.status === 'cancelled').length;

      // Bookings by month
      const bookingsByMonth = this.groupByMonth(
        data.bookings,
        'created_at',
        () => 1
      );

      // Bookings by status
      const bookingsByStatus = this.groupByField(
        data.bookings,
        'status',
        () => 1
      );

      // Bookings by event type
      const bookingsByEventType = this.groupByField(
        data.bookings,
        'event_type',
        () => 1
      );

      // Conversion rate (pending -> accepted)
      const conversionRate = totalBookings > 0 
        ? ((acceptedBookings / totalBookings) * 100) 
        : 0;

      // Completion rate
      const completionRate = acceptedBookings > 0
        ? ((completedBookings / acceptedBookings) * 100)
        : 0;

      // Cancellation rate
      const cancellationRate = totalBookings > 0
        ? ((cancelledBookings / totalBookings) * 100)
        : 0;

      return {
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
        cancelledBookings,
        bookingsByMonth,
        bookingsByStatus,
        bookingsByEventType,
        conversionRate,
        completionRate,
        cancellationRate
      };
    } catch (error) {
      console.error('Error fetching booking analytics:', error);
      throw error;
    }
  }

  async getPopularInstrumentsAndGenres() {
    try {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('instruments, genres')
        .eq('role', 'musician')
        .not('instruments', 'is', null);

      if (!profiles) return { instruments: [], genres: [] };

      // Count instruments
      const instrumentCounts: Record<string, number> = {};
      const genreCounts: Record<string, number> = {};

      profiles.forEach(profile => {
        if (profile.instruments && Array.isArray(profile.instruments)) {
          profile.instruments.forEach((instrument: string) => {
            instrumentCounts[instrument] = (instrumentCounts[instrument] || 0) + 1;
          });
        }
        if (profile.genres && Array.isArray(profile.genres)) {
          profile.genres.forEach((genre: string) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        }
      });

      const instruments = Object.entries(instrumentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const genres = Object.entries(genreCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { instruments, genres };
    } catch (error) {
      console.error('Error fetching popular instruments and genres:', error);
      throw error;
    }
  }

  async getReviewAnalytics(dateRange: { start: string; end: string } | null = null) {
    try {
      const data = await this.getAnalyticsData(dateRange);
      
      const totalReviews = data.reviews.length;
      const averageRating = totalReviews > 0
        ? data.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

      // Rating distribution
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: data.reviews.filter(r => r.rating === rating).length
      }));

      // Reviews by month
      const reviewsByMonth = this.groupByMonth(
        data.reviews,
        'created_at',
        () => 1
      );

      // Average ratings by category
      const avgPerformanceRating = totalReviews > 0
        ? data.reviews.reduce((sum, r) => sum + (r.performance_rating || 0), 0) / totalReviews
        : 0;
      const avgCommunicationRating = totalReviews > 0
        ? data.reviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0) / totalReviews
        : 0;
      const avgProfessionalismRating = totalReviews > 0
        ? data.reviews.reduce((sum, r) => sum + (r.professionalism_rating || 0), 0) / totalReviews
        : 0;

      return {
        totalReviews,
        averageRating,
        ratingDistribution,
        reviewsByMonth,
        avgPerformanceRating,
        avgCommunicationRating,
        avgProfessionalismRating
      };
    } catch (error) {
      console.error('Error fetching review analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private groupByMonth(
    items: any[],
    dateField: string,
    valueFn: (item: any) => number,
    cumulative: boolean = false
  ): Array<{ month: string; value: number }> {
    if (!items || items.length === 0) {
      return [];
    }

    const grouped: Record<string, number> = {};
    let cumulativeValue = 0;

    items.forEach(item => {
      if (!item || !item[dateField]) return;
      
      const date = new Date(item[dateField]);
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (cumulative) {
        cumulativeValue += valueFn(item);
        grouped[monthKey] = cumulativeValue;
      } else {
        grouped[monthKey] = (grouped[monthKey] || 0) + valueFn(item);
      }
    });

    return Object.entries(grouped)
      .map(([key, value]) => {
        try {
          const date = new Date(key + '-01');
          if (isNaN(date.getTime())) return null;
          return {
            month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            value
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is { month: string; value: number } => item !== null)
      .sort((a, b) => {
        try {
          return new Date(a.month).getTime() - new Date(b.month).getTime();
        } catch {
          return 0;
        }
      });
  }

  private groupByField(
    items: any[],
    field: string,
    valueFn: (item: any) => number
  ): Record<string, number> {
    if (!items || items.length === 0) {
      return {};
    }

    const grouped: Record<string, number> = {};
    
    items.forEach(item => {
      if (!item) return;
      const key = item[field] || 'Unknown';
      grouped[key] = (grouped[key] || 0) + valueFn(item);
    });

    return grouped;
  }
}

export const adminService = new AdminService();
