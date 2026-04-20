import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { formatGHSWithSymbol } from '@/lib/currency';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSettings } from '@/api/settings';
  
  interface MusicianOverviewStats {
    totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarned: number;
  pendingPayouts: number;
  releasedEarnings: number;
  adminFee: number;
  netEarnings: number;
  profileCompletion: number;
  isVerified: boolean;
}

export function MusicianOverview() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminPercentage, setAdminPercentage] = useState(0.05);
  const [stats, setStats] = useState<MusicianOverviewStats>({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalEarned: 0,
    pendingPayouts: 0,
    releasedEarnings: 0,
    adminFee: 0,
    netEarnings: 0,
    profileCompletion: 0,
    isVerified: false,
  });

  // Fetch admin commission percentage
  useEffect(() => {
    const fetchAdminPercentage = async () => {
      try {
        const settings = await getSettings();
        if (settings?.bookingPayments?.platformCommissionRate !== undefined) {
          setAdminPercentage(settings.bookingPayments.platformCommissionRate / 100);
        }
      } catch (error) {
        console.error('Failed to fetch admin commission rate:', error);
      }
    };
    fetchAdminPercentage();
  }, []);

  useEffect(() => {
    const fetchMusicianStats = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch bookings for this musician with payout status.
        // Prefer using stored per-booking platform fees when available so changing the platform
        // commission rate only affects subsequent bookings (not historical earnings).
        let bookings: any[] = [];
        {
          const { data, error: bookingsError } = await supabase
            .from('bookings')
            .select('status, total_amount, payment_status, payout_released, platform_fee')
            .eq('musician_id', user.id);
          if (bookingsError) {
            // Fallback for schemas that don't have platform_fee on bookings.
            const { data: fallback, error: fallbackError } = await supabase
              .from('bookings')
              .select('status, total_amount, payment_status, payout_released')
              .eq('musician_id', user.id);
            if (fallbackError) throw fallbackError;
            bookings = fallback || [];
          } else {
            bookings = data || [];
          }
        }

        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('profile_completion_percentage, documents_verified')
          .eq('user_id', user.id)
          .single();

        if (profileError) console.warn('Error fetching profile:', profileError);

        // Calculate earnings with proper fee deductions
        // Completed bookings should be those that are paid (regardless of status)
        const paidBookings = bookings?.filter((b) => b.payment_status === 'paid') || [];
        
        let totalEarned = 0; // Total net earnings from all paid bookings
        let pendingPayouts = 0; // Paid but not released yet
        let releasedEarnings = 0; // Already released to musician
        let totalPlatformFees = 0; // Total platform fees
        let totalPaystackFees = 0; // Total Paystack fees
        
        paidBookings.forEach((booking) => {
          const totalAmount = parseFloat(booking.total_amount?.toString() || '0');
          
          // Calculate what musician actually receives after all fees
          const platformFee =
            typeof booking.platform_fee === 'number' && Number.isFinite(booking.platform_fee)
              ? booking.platform_fee
              : totalAmount * adminPercentage;
          const paystackFee = (totalAmount * 0.015) + 0.50; // 1.5% + ₵0.50
          const musicianReceives = Math.max(0, totalAmount - platformFee - paystackFee);
          
          totalPlatformFees += platformFee;
          totalPaystackFees += paystackFee;
          totalEarned += musicianReceives;
          
          // Check if payout has been released
          if (booking.payout_released) {
            releasedEarnings += musicianReceives;
          } else {
            // Paid but not released yet
            pendingPayouts += musicianReceives;
          }
        });
        
        // Total fees deducted from all bookings
        const totalFees = totalPlatformFees + totalPaystackFees;

        const statsData: MusicianOverviewStats = {
          totalBookings: bookings?.length || 0,
          pendingBookings:
            bookings?.filter((b) => b.status === 'pending').length || 0,
          completedBookings: paidBookings.length, // Count paid bookings as completed
          cancelledBookings:
            bookings?.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length ||
            0,
          totalEarned, // Total net earnings from all paid bookings
          pendingPayouts, // Paid but awaiting release
          releasedEarnings, // Already released
          adminFee: totalFees, // Total fees (platform + Paystack)
          netEarnings: releasedEarnings, // What musician has actually received
          profileCompletion: profile?.profile_completion_percentage || 0,
          isVerified: profile?.documents_verified || false,
        };

        setStats(statsData);
      } catch (err: any) {
        console.error('Error fetching musician stats:', err);
        setError(err.message || 'Failed to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusicianStats();
  }, [user?.id, adminPercentage]);

  if (error) {
    return (
      <Alert variant="destructive" className="animate-slide-in">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-16" />
            ) : (
              <div className="text-fluid-2xl font-bold">
                {stats.totalBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-16" />
            ) : (
              <div className="text-fluid-2xl font-bold text-amber-600">
                {stats.pendingBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-32" />
            ) : (
              <div className="text-fluid-2xl font-bold text-green-600">
                {formatGHSWithSymbol(stats.netEarnings)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">After all fees</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-32" />
            ) : (
              <div className="text-fluid-2xl font-bold text-yellow-600">
                {formatGHSWithSymbol(stats.pendingPayouts)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Net amount awaiting release</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-24" />
            ) : (
              <div className="text-fluid-2xl font-bold text-blue-600">
                {(adminPercentage * 100).toFixed(1)}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">+ Paystack fees</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-16" />
            ) : (
              <div className="text-fluid-2xl font-bold text-green-600">
                {stats.completedBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Paid bookings</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-32" />
            ) : (
              <div className="text-fluid-2xl font-bold">
                {formatGHSWithSymbol(stats.totalEarned)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Net from all paid bookings</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="h-8 w-32" />
            ) : (
              <div className="text-fluid-2xl font-bold">
                {stats.completedBookings > 0
                  ? formatGHSWithSymbol(stats.totalEarned / stats.completedBookings)
                  : formatGHSWithSymbol(0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Per completed booking</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MusicianOverview;
