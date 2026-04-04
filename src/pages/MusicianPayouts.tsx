import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatGHSWithSymbol } from '@/lib/currency';
import { Banknote, Clock, CheckCircle2, TrendingUp, Calendar, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FeeBreakdown } from '@/components/musician/FeeBreakdown';
import { getSettings } from '@/api/settings';

interface Payout {
  id: string;
  booking_id: string | null;
  amount: number;
  status: string | null;
  payment_method: string;
  created_at: string | null;
  event_type: string;
  hirer_name: string;
}

const MusicianPayouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platformCommissionRate, setPlatformCommissionRate] = useState(10);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonthEarnings: 0,
  });

  // Fetch platform commission rate
  useEffect(() => {
    const fetchCommissionRate = async () => {
      try {
        const settings = await getSettings();
        if (settings?.bookingPayments?.platformCommissionRate !== undefined) {
          setPlatformCommissionRate(settings.bookingPayments.platformCommissionRate);
        }
      } catch (error) {
        console.error('Failed to fetch platform commission rate:', error);
      }
    };
    fetchCommissionRate();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPayouts();
    }
  }, [user]);

  const fetchPayouts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch completed payout transactions (including metadata)
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('id, booking_id, amount, status, payment_method, created_at, metadata')
        .eq('user_id', user.id)
        .eq('type', 'payout')
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Fetch pending payouts from bookings table (completed bookings with paid status but payout not released)
      const { data: pendingBookingsData, error: pendingError } = await supabase
        .from('bookings_with_profiles')
        .select('id, total_amount, event_type, hirer_name, service_confirmed_at, payment_status, payout_released')
        .eq('musician_id', user.id)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .eq('payout_released', false);

      if (pendingError) throw pendingError;

      // Get booking details for completed transactions
      const bookingIds = transactionsData?.map((tx) => tx.booking_id).filter(Boolean) || [];
      
      const { data: bookingsData } = await supabase
        .from('bookings_with_profiles')
        .select('id, event_type, hirer_name')
        .in('id', bookingIds);

      const bookingsMap = new Map(
        bookingsData?.map((b: any) => [b.id, { event_type: b.event_type, hirer_name: b.hirer_name }])
      );

      // Format completed payouts
      const completedPayouts: Payout[] = (transactionsData || []).map((tx) => {
        const booking = bookingsMap.get(tx.booking_id || '');
        // Check if this is a released payout (has payout_released in metadata)
        const isReleased = (tx as any).metadata?.payout_released === true;
        
        return {
          id: tx.id,
          booking_id: tx.booking_id,
          amount: parseFloat(tx.amount as any) || 0,
          status: isReleased ? 'paid' : 'pending', // Show as 'paid' if payout is released
          payment_method: tx.payment_method || 'bank_transfer',
          created_at: tx.created_at,
          event_type: booking?.event_type || 'Event',
          hirer_name: booking?.hirer_name || 'Unknown',
        };
      });

      // Format pending payouts
      const pendingPayouts: Payout[] = (pendingBookingsData || []).map((booking: any) => {
        // Calculate musician payout (total - platform fee - paystack fee)
        const totalAmount = parseFloat(booking.total_amount) || 0;
        const platformFee = totalAmount * (platformCommissionRate / 100);
        const paystackFee = totalAmount * 0.015 + 0.50;
        const musicianPayout = Math.max(0, totalAmount - platformFee - paystackFee);

        return {
          id: `pending-${booking.id}`,
          booking_id: booking.id,
          amount: musicianPayout,
          status: 'pending',
          payment_method: 'bank_transfer',
          created_at: booking.service_confirmed_at,
          event_type: booking.event_type || 'Event',
          hirer_name: booking.hirer_name || 'Unknown',
        };
      });

      // Combine and sort all payouts
      const allPayouts = [...completedPayouts, ...pendingPayouts].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setPayouts(allPayouts);

      const totalEarnings = completedPayouts
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingPayoutsCount = pendingPayouts.length;
      const completedPayoutsCount = completedPayouts.filter((p) => p.status === 'paid').length;

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const thisMonthEarnings = completedPayouts
        .filter((p) => p.status === 'paid' && p.created_at && new Date(p.created_at) >= thisMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalEarnings,
        pendingPayouts: pendingPayoutsCount,
        completedPayouts: completedPayoutsCount,
        thisMonthEarnings,
      });
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Awaiting Release</Badge>;
    }
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Payouts</h1>
        <FeeBreakdown 
          bookingAmount={500} 
          platformCommissionRate={platformCommissionRate}
        />
      </div>

      {/* Fee Information Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 mb-2">
                <strong>Payout Information:</strong> All amounts shown are net earnings after platform commission 
                ({platformCommissionRate}%) and payment processing fees (1.5% + GHS 0.50) have been deducted.
              </p>
              <p className="text-blue-700">
                Payouts are automatically released to your account after both you and the hirer confirm service completion.
                Pending payouts will appear here immediately after service confirmation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGHSWithSymbol(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGHSWithSymbol(stats.thisMonthEarnings)}</div>
            <p className="text-xs text-muted-foreground">Current month earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedPayouts}</div>
            <p className="text-xs text-muted-foreground">Payouts received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayouts}</div>
            <p className="text-xs text-muted-foreground">Awaiting release</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payouts yet</p>
              <p className="text-sm mt-2">
                Payouts will appear here after bookings are completed and confirmed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Hirer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{payout.event_type}</TableCell>
                      <TableCell>{payout.hirer_name}</TableCell>
                      <TableCell className="font-medium">
                        {formatGHSWithSymbol(payout.amount)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payout.payment_method.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicianPayouts;
