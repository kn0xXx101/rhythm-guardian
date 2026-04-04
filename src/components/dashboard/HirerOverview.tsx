import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardIcon,
} from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { CediIcon } from '@/components/ui/cedi-icon';
import { useEffect, useState } from 'react';
import { formatGHSWithSymbol } from '@/lib/currency';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface HirerOverviewStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  activeBookings: number;
}

export function HirerOverview() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<HirerOverviewStats>({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0,
    activeBookings: 0,
  });

  useEffect(() => {
    const fetchHirerStats = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch all bookings for this hirer with payment status
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('status, total_amount, payment_status')
          .eq('hirer_id', user.id);

        if (bookingsError) {
          // If table doesn't exist, show zeros instead of error
          if (bookingsError.message?.includes('does not exist') || bookingsError.message?.includes('relation')) {
            console.log('Bookings table not yet created, showing zero stats');
            setBookings([]);
            setStats({
              totalBookings: 0,
              pendingBookings: 0,
              confirmedBookings: 0,
              completedBookings: 0,
              cancelledBookings: 0,
              totalSpent: 0,
              activeBookings: 0,
            });
            setIsLoading(false);
            return;
          }
          throw bookingsError;
        }

        setBookings(bookings || []);

        const statsData: HirerOverviewStats = {
          totalBookings: bookings?.length || 0,
          pendingBookings:
            bookings?.filter((b) => b.status === 'pending' || b.status === 'accepted').length || 0,
          confirmedBookings: bookings?.filter((b) => b.status === 'accepted').length || 0,
          completedBookings: bookings?.filter((b) => b.status === 'completed').length || 0,
          cancelledBookings:
            bookings?.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length ||
            0,
          // Total spent should only include paid bookings
          totalSpent:
            bookings
              ?.filter((b) => b.payment_status === 'paid')
              .reduce((sum, b) => sum + parseFloat(b.total_amount?.toString() || '0'), 0) || 0,
          activeBookings:
            bookings?.filter((b) => b.status === 'accepted' || b.status === 'pending').length ||
            0,
        };

        setStats(statsData);
      } catch (err: any) {
        console.error('Error fetching hirer stats:', err);
        // Only show error for real errors, not missing tables
        if (!err.message?.includes('does not exist') && !err.message?.includes('relation')) {
          setError(err.message || 'Failed to load dashboard statistics');
        }
        // Set default stats
        setStats({
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalSpent: 0,
          activeBookings: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHirerStats();
  }, [user?.id]);

  if (error) {
    return (
      <Alert variant="destructive" className="animate-slide-in">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h2 className="text-fluid-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground mt-1">Your booking statistics at a glance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="gradient-border" tooltip="Total bookings created across all time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CardIcon icon={Calendar} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold group-hover:text-primary transition-colors">
                {stats.totalBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
          </CardContent>
        </Card>

        <Card variant="gradient-border" tooltip="Bookings awaiting musician response">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <CardIcon icon={Clock} className="text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors">
                {stats.pendingBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
          </CardContent>
        </Card>

        <Card variant="gradient-border" tooltip="Confirmed bookings currently active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CardIcon icon={CheckCircle2} className="text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                {stats.activeBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Confirmed & in progress</p>
          </CardContent>
        </Card>

        <Card variant="gradient-border" tooltip="Total amount spent on completed bookings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CardIcon icon={CediIcon} className="text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                {formatGHSWithSymbol(stats.totalSpent)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">On paid & completed bookings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold text-green-600">
                {stats.completedBookings}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold text-red-600">{stats.cancelledBookings}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Cancelled or rejected</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton className="p-0 border-0 bg-transparent" />
            ) : (
              <div className="text-fluid-2xl font-bold">
                {(() => {
                  const paidBookingsCount = bookings.filter((b) => (b.status as string) === 'paid' || b.status === 'completed').length;
                  return paidBookingsCount > 0
                    ? formatGHSWithSymbol(stats.totalSpent / paidBookingsCount)
                    : formatGHSWithSymbol(0);
                })()}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Per paid booking</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HirerOverview;
