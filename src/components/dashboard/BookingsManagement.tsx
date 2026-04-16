import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { payoutService } from '@/services/payout';
import { adminService } from '@/services/admin';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PaymentVerificationPanel } from '@/components/admin/PaymentVerificationPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, CheckCircle2, XCircle, Clock, Banknote, AlertCircle, Zap, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatGHSWithSymbol } from '@/lib/currency';
import { TableSkeleton } from '@/components/ui/skeleton';
import { exportToCSV, bookingExportColumns } from '@/lib/export-utils';
import { getSettings } from '@/api/settings';

interface Booking {
  id: string;
  musician_id: string;
  hirer_id: string;
  hirer_name: string;
  hirer_email: string;
  musician_name: string;
  musician_email: string;
  event_type: string;
  event_date: string;
  location: string;
  total_amount: number;
  platform_fee: number;
  paystack_fee: number;
  musician_payout: number;
  payment_status: string;
  status: string;
  service_confirmed_by_hirer: boolean;
  service_confirmed_by_musician: boolean;
  payout_released: boolean;
  created_at: string;
}

export function BookingsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [platformCommissionRate, setPlatformCommissionRate] = useState(10);
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState<'delete_booking' | 'purge_bookings' | null>(null);
  const [dangerBooking, setDangerBooking] = useState<Booking | null>(null);
  const [isDangerWorking, setIsDangerWorking] = useState(false);
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings_with_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Debug: Log the raw data to see what we're getting
      console.log('Raw booking data sample:', data?.[0]);
      console.log('Total bookings fetched:', data?.length);

      const formattedBookings: Booking[] = (data || []).map((booking: any) => {
        const totalAmount = parseFloat(booking.total_amount) || 0;
        const platformFee = totalAmount * (platformCommissionRate / 100); // Dynamic platform fee
        const paystackFee = totalAmount * 0.015 + 0.50; // 1.5% + ₵0.50
        const musicianPayout = totalAmount - platformFee - paystackFee;

        // Debug logging for confirmation status
        if (booking.service_confirmed_by_hirer || booking.service_confirmed_by_musician) {
          console.log('Booking with confirmations:', {
            id: booking.id,
            hirer_confirmed: booking.service_confirmed_by_hirer,
            musician_confirmed: booking.service_confirmed_by_musician,
            confirmed_at: booking.service_confirmed_at
          });
        }

        return {
          id: booking.id,
          musician_id: booking.musician_id,
          hirer_id: booking.hirer_id,
          hirer_name: booking.hirer_name || 'Unknown',
          hirer_email: booking.hirer_email || '',
          musician_name: booking.musician_name || 'Unknown',
          musician_email: booking.musician_email || '',
          event_type: booking.event_type || 'Event',
          event_date: booking.event_date,
          location: booking.location || 'TBD',
          total_amount: totalAmount,
          platform_fee: platformFee,
          paystack_fee: paystackFee,
          musician_payout: musicianPayout,
          payment_status: booking.payment_status || 'pending',
          status: booking.status || 'pending',
          service_confirmed_by_hirer: Boolean(booking.service_confirmed_by_hirer),
          service_confirmed_by_musician: Boolean(booking.service_confirmed_by_musician),
          payout_released: booking.payout_released || false,
          created_at: booking.created_at,
        };
      });

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [platformCommissionRate, toast]);

  // Fetch platform commission rate from admin settings
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
    if (platformCommissionRate !== null) {
      fetchBookings();
    }
  }, [fetchBookings, platformCommissionRate]);

  // Real-time subscription for bookings
  useEffect(() => {
    if (platformCommissionRate === null) return;

    const channel = supabase
      .channel('bookings-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [platformCommissionRate, fetchBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.hirer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.musician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || booking.payment_status === paymentFilter;
      
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [bookings, searchTerm, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const paidBookings = bookings.filter(b => b.payment_status === 'paid').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const awaitingRelease = bookings.filter(
      b => b.payment_status === 'paid' && 
           b.service_confirmed_by_hirer && 
           b.service_confirmed_by_musician && 
           !b.payout_released
    ).length;
    const totalRevenue = bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_amount, 0);
    const totalPlatformFees = bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.platform_fee, 0);
    const totalPaystackFees = bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.paystack_fee, 0);

    return {
      totalBookings,
      paidBookings,
      completedBookings,
      awaitingRelease,
      totalRevenue,
      totalPlatformFees,
      totalPaystackFees,
    };
  }, [bookings]);

  const handleReleaseFunds = async () => {
    if (!selectedBooking) return;

    // Validation
    if (selectedBooking.payment_status !== 'paid') {
      toast({
        title: 'Cannot Release Funds',
        description: 'Payment has not been received yet.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBooking.service_confirmed_by_hirer || !selectedBooking.service_confirmed_by_musician) {
      toast({
        title: 'Cannot Release Funds',
        description: 'Service must be confirmed by both parties before releasing funds.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedBooking.payout_released) {
      toast({
        title: 'Already Released',
        description: 'Funds have already been released for this booking.',
        variant: 'destructive',
      });
      return;
    }

    setIsReleasing(true);
    try {
      // Try automatic payout via Paystack Transfer API
      try {
        await payoutService.manualPayout(selectedBooking.id);
        
        toast({
          title: 'Automatic Payout Initiated',
          description: `${formatGHSWithSymbol(selectedBooking.musician_payout)} is being transferred to ${selectedBooking.musician_name} via Paystack.`,
        });

        // Refresh bookings
        await fetchBookings();
        setIsDialogOpen(false);
        setSelectedBooking(null);
        return;
      } catch (autoPayoutError: any) {
        console.error('Automatic payout failed, falling back to manual:', autoPayoutError);
        
        // If automatic payout fails, fall back to manual marking
        toast({
          title: 'Automatic Transfer Failed',
          description: 'Marking as released manually. You may need to transfer funds manually.',
          variant: 'default',
        });
      }

      // Fallback: Manual release (mark as released without Paystack transfer)
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payout_released: true,
          payout_released_at: new Date().toISOString(),
        } as any)
        .eq('id', selectedBooking.id);

      if (updateError) throw updateError;

      // Create payout transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          booking_id: selectedBooking.id,
          user_id: selectedBooking.musician_id,
          amount: selectedBooking.musician_payout,
          type: 'payout',
          status: 'paid',
          payment_method: 'manual',
          currency: 'GHS',
          platform_fee: 0,
          metadata: { manual_release: true },
        });

      if (txError) {
        console.error('Failed to create payout transaction:', txError);
      }

      // Send notification to musician
      try {
        await supabase.from('notifications').insert({
          user_id: selectedBooking.musician_id,
          type: 'payment' as const,
          title: 'Payment Released',
          content: `Your payment of ${formatGHSWithSymbol(selectedBooking.musician_payout)} for ${selectedBooking.event_type} has been released. Please check your account.`,
          action_url: '/musician/bookings',
          read: false,
          priority: 'high',
          metadata: { bookingId: selectedBooking.id },
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      toast({
        title: 'Funds Released',
        description: `${formatGHSWithSymbol(selectedBooking.musician_payout)} has been released to ${selectedBooking.musician_name}.`,
      });

      // Refresh bookings
      await fetchBookings();
      setIsDialogOpen(false);
      setSelectedBooking(null);
    } catch (error: any) {
      console.error('Error releasing funds:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to release funds',
        variant: 'destructive',
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  const openDangerDialog = (action: 'delete_booking' | 'purge_bookings', booking?: Booking) => {
    setDangerAction(action);
    setDangerBooking(booking || null);
    setDangerDialogOpen(true);
  };

  const runDangerAction = async () => {
    if (!dangerAction) return;
    setIsDangerWorking(true);
    try {
      if (dangerAction === 'delete_booking') {
        if (!dangerBooking) throw new Error('No booking selected');
        await adminService.deleteBooking(dangerBooking.id);
        toast({ title: 'Booking deleted', description: `Booking ${dangerBooking.id.substring(0, 8)} removed.` });
        setDangerDialogOpen(false);
        setDangerBooking(null);
        await fetchBookings();
        return;
      }
      if (dangerAction === 'purge_bookings') {
        await adminService.deleteAllBookings();
        toast({ title: 'Bookings cleared', description: 'All bookings were deleted.' });
        setDangerDialogOpen(false);
        setDangerBooking(null);
        await fetchBookings();
        return;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setIsDangerWorking(false);
    }
  };

  const handleProcessAllPayouts = async () => {
    setIsProcessingAll(true);
    try {
      const result = await payoutService.processAutomaticPayouts();
      
      if (result.processed > 0) {
        toast({
          title: 'Automatic Payouts Processed',
          description: `Successfully processed ${result.processed} payout(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
        });
      } else {
        toast({
          title: 'No Eligible Payouts',
          description: 'No bookings are currently eligible for automatic payout.',
        });
      }

      if (result.errors.length > 0) {
        console.error('Payout errors:', result.errors);
      }

      // Refresh bookings
      await fetchBookings();
    } catch (error: any) {
      console.error('Error processing automatic payouts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process automatic payouts',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingAll(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      accepted: { variant: 'outline', className: 'bg-blue-100 text-blue-800' },
      upcoming: { variant: 'outline', className: 'bg-blue-100 text-blue-800' },
      completed: { variant: 'outline', className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'destructive', className: '' },
      rejected: { variant: 'destructive', className: '' },
      expired: { variant: 'outline', className: 'bg-gray-100 text-gray-600' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config?.variant} className={config?.className}>
        {status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      paid: { variant: 'outline', className: 'bg-green-100 text-green-800' },
      failed: { variant: 'destructive', className: '' },
      refunded: { variant: 'outline', className: 'bg-gray-100 text-gray-800' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config?.variant} className={config?.className}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Bookings Management"
        text="Monitor all bookings, payments, and release funds to musicians."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">{stats.paidBookings} paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Release</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.awaitingRelease}</div>
            <p className="text-xs text-muted-foreground">Services confirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGHSWithSymbol(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From paid bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGHSWithSymbol(stats.totalPlatformFees)}</div>
            <p className="text-xs text-muted-foreground">{platformCommissionRate ?? 10}% commission</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Bookings</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => openDangerDialog('purge_bookings')}
              >
                Clear all bookings
              </Button>
              <Button
                onClick={() => exportToCSV(filteredBookings, bookingExportColumns, 'bookings')}
                variant="outline"
                className="gap-2"
                disabled={filteredBookings.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              {stats.awaitingRelease > 0 && (
                <Button
                  onClick={handleProcessAllPayouts}
                  disabled={isProcessingAll}
                  className="gap-2"
                  variant="default"
                >
                  <Zap className="h-4 w-4" />
                  {isProcessingAll ? 'Processing...' : `Auto-Release ${stats.awaitingRelease} Payout${stats.awaitingRelease > 1 ? 's' : ''}`}
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} cols={8} />
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Hirer</TableHead>
                    <TableHead>Musician</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">
                        {booking.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{booking.hirer_name}</TableCell>
                      <TableCell>{booking.musician_name}</TableCell>
                      <TableCell>{booking.event_type}</TableCell>
                      <TableCell>
                        {booking.event_date
                          ? new Date(booking.event_date).toLocaleDateString()
                          : 'TBD'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatGHSWithSymbol(booking.total_amount)}
                      </TableCell>
                      <TableCell>{getPaymentBadge(booking.payment_status)}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {booking.service_confirmed_by_hirer ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Hirer confirmed" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" aria-label="Hirer not confirmed" />
                          )}
                          {booking.service_confirmed_by_musician ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Musician confirmed" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" aria-label="Musician not confirmed" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openBookingDetails(booking)}>
                            Details
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDangerDialog('delete_booking', booking)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Confirm Dialog */}
      <Dialog open={dangerDialogOpen} onOpenChange={setDangerDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {dangerAction === 'delete_booking' ? 'Delete booking' : 'Clear all bookings'}
            </DialogTitle>
            <DialogDescription>
              {dangerAction === 'delete_booking'
                ? 'This will permanently delete this booking. This cannot be undone.'
                : 'This will permanently delete ALL bookings. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {dangerAction === 'delete_booking' && dangerBooking ? (
              <div>
                You are about to delete booking: <span className="font-mono">{dangerBooking.id}</span>
              </div>
            ) : (
              <div>You are about to clear all bookings.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDangerDialogOpen(false)} disabled={isDangerWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={runDangerAction} disabled={isDangerWorking}>
              {isDangerWorking ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details & Payment Verification</DialogTitle>
            <DialogDescription>
              Review booking information and manage payments
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payment">Payment Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Booking ID</p>
                    <p className="font-mono text-sm">{selectedBooking.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(selectedBooking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Parties</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Hirer</p>
                      <p>{selectedBooking.hirer_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedBooking.hirer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Musician</p>
                      <p>{selectedBooking.musician_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedBooking.musician_email}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Event Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Event Type</p>
                      <p>{selectedBooking.event_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p>
                        {selectedBooking.event_date
                          ? new Date(selectedBooking.event_date).toLocaleDateString()
                          : 'TBD'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p>{selectedBooking.location}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Financial Breakdown</h4>
                  <div className="space-y-2 bg-muted p-3 rounded-md">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Amount Paid</span>
                      <span className="font-medium">{formatGHSWithSymbol(selectedBooking.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Platform Fee ({platformCommissionRate}%)</span>
                      <span>- {formatGHSWithSymbol(selectedBooking.platform_fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Paystack Fee (1.5% + ₵0.50)</span>
                      <span>- {formatGHSWithSymbol(selectedBooking.paystack_fee)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Musician Payout</span>
                      <span className="text-green-600">
                        {formatGHSWithSymbol(selectedBooking.musician_payout)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                      {getPaymentBadge(selectedBooking.payment_status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Booking Status</p>
                      {getStatusBadge(selectedBooking.status)}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Service Confirmation</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confirmed by Hirer</span>
                      {selectedBooking.service_confirmed_by_hirer ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confirmed by Musician</span>
                      {selectedBooking.service_confirmed_by_musician ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payout Released</span>
                      {selectedBooking.payout_released ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {!selectedBooking.payout_released &&
                  selectedBooking.payment_status === 'paid' &&
                  selectedBooking.service_confirmed_by_hirer &&
                  selectedBooking.service_confirmed_by_musician && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ Ready to release funds to musician
                      </p>
                    </div>
                  )}

                {!selectedBooking.service_confirmed_by_hirer ||
                  (!selectedBooking.service_confirmed_by_musician && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠ Waiting for service confirmation from both parties
                      </p>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="payment" className="mt-4">
                <PaymentVerificationPanel bookingId={selectedBooking.id} />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            {selectedBooking && !selectedBooking.payout_released && (
              <Button
                onClick={handleReleaseFunds}
                disabled={
                  isReleasing ||
                  selectedBooking.payment_status !== 'paid' ||
                  !selectedBooking.service_confirmed_by_hirer ||
                  !selectedBooking.service_confirmed_by_musician
                }
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {isReleasing ? 'Processing...' : 'Auto-Release Funds'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BookingsManagement;
