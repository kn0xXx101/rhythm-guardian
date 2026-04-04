import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { auditService } from '@/services/audit';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VirtualTableBody } from '@/components/ui/virtual-table-body';
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
import { Search, CreditCard, AlertTriangle, CheckCircle, Banknote, ArrowRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatGHSWithSymbol } from '@/lib/currency';
import { TableSkeleton } from '@/components/ui/skeleton';
import { exportToCSV, transactionExportColumns } from '@/lib/export-utils';

// Removed mockTransactions and mockDisputes arrays

export function TransactionsMonitor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transactionScrollElement, setTransactionScrollElement] = useState<HTMLDivElement | null>(
    null
  );
  const [disputeScrollElement, setDisputeScrollElement] = useState<HTMLDivElement | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalFees: 0,
    completedCount: 0,
    pendingCount: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
    fetchDisputes();
  }, []);

  // Real-time subscription for transactions
  useEffect(() => {
    const channel = supabase
      .channel('transactions-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Real-time subscription for disputes
  useEffect(() => {
    const channel = supabase
      .channel('disputes-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disputes',
        },
        () => {
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      console.log('TransactionsMonitor: Fetching transactions...');
      
      // Check if transactions table exists and is accessible
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          status,
          created_at,
          type,
          payment_method,
          currency,
          platform_fee,
          net_amount,
          paystack_reference,
          user_id,
          booking_id
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('TransactionsMonitor: Raw query result:', { 
        data: transactionsData, 
        error: txError,
        count: transactionsData?.length || 0 
      });

      if (txError) {
        console.warn('Transactions table error:', txError);
        // Set empty data instead of throwing error
        setTransactions([]);
        setStats({
          totalRevenue: 0,
          totalFees: 0,
          completedCount: 0,
          pendingCount: 0,
        });
        return;
      }

      // Handle empty transactions
      if (!transactionsData || transactionsData.length === 0) {
        console.log('TransactionsMonitor: No transactions found in database');
        setTransactions([]);
        setStats({
          totalRevenue: 0,
          totalFees: 0,
          completedCount: 0,
          pendingCount: 0,
        });
        return;
      }

      console.log('TransactionsMonitor: Processing', transactionsData.length, 'transactions');

      // Get user and booking details separately
      const userIds = [...new Set(transactionsData.map((tx: any) => tx.user_id).filter(Boolean))];
      const bookingIds = [
        ...new Set(transactionsData.map((tx: any) => tx.booking_id).filter(Boolean)),
      ];

      let usersData: any[] = [];
      let bookingsData: any[] = [];

      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        usersData = data || [];
      }

      if (bookingIds.length > 0) {
        const { data } = await supabase
          .from('bookings')
          .select('id, event_type')
          .in('id', bookingIds);
        bookingsData = data || [];
      }

      const usersMap = new Map(usersData.map((u: any) => [u.user_id, u.full_name]));
      const bookingsMap = new Map(bookingsData.map((b: any) => [b.id, b.event_type]));

      const formattedTransactions = transactionsData.map((tx: any) => ({
        id: tx.id.substring(0, 8),
        fullId: tx.id,
        customer: usersMap.get(tx.user_id) || 'Unknown',
        service: bookingsMap.get(tx.booking_id) || tx.type || 'Service',
        amount: parseFloat(tx.amount) || 0,
        date: tx.created_at,
        status:
          tx.status === 'paid' ? 'completed' : tx.status === 'pending' ? 'processing' : 'failed',
        currency: tx.currency || 'GHS',
        platformFee: parseFloat(tx.platform_fee) || 0,
        netAmount: parseFloat(tx.net_amount) || 0,
        reference: tx.paystack_reference,
      }));

      setTransactions(formattedTransactions);

      // Calculate stats - only count transactions with 'paid' status as completed
      // Map database 'paid' status to 'completed' for display
      const paidTransactions = formattedTransactions.filter((tx: any) => tx.status === 'completed');
      const pendingTransactions = formattedTransactions.filter((tx: any) => tx.status === 'processing');
      
      const totalRevenue = paidTransactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      const totalFees = paidTransactions.reduce((sum: number, tx: any) => sum + tx.platformFee, 0);
      const completedCount = paidTransactions.length;
      const pendingCount = pendingTransactions.length;

      console.log('TransactionsMonitor: Financial Stats Calculated:', {
        totalTransactions: formattedTransactions.length,
        completedTransactions: completedCount,
        pendingTransactions: pendingCount,
        totalRevenue,
        totalFees,
        sampleCompletedTx: paidTransactions[0],
        statusBreakdown: formattedTransactions.reduce((acc: any, tx: any) => {
          acc[tx.status] = (acc[tx.status] || 0) + 1;
          return acc;
        }, {})
      });

      setStats({
        totalRevenue,
        totalFees: totalFees,
        completedCount,
        pendingCount,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Set empty data instead of showing error toast
      setTransactions([]);
      setStats({
        totalRevenue: 0,
        totalFees: 0,
        completedCount: 0,
        pendingCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDisputes = async () => {
    try {
      const { data: disputesData, error: disputesError } = await supabase
        .from('disputes')
        .select(
          `
          id,
          booking_id,
          filed_by,
          type,
          status,
          description,
          created_at
        `
        )
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      if (!disputesData || disputesData.length === 0) {
        setDisputes([]);
        return;
      }

      // Get related data
      const userIds = [...new Set(disputesData.map((d: any) => d.filed_by).filter(Boolean))];
      const bookingIds = [...new Set(disputesData.map((d: any) => d.booking_id).filter(Boolean))];

      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, total_amount')
        .in('id', bookingIds);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('id, booking_id')
        .in('booking_id', bookingIds);

      const usersMap = new Map(usersData?.map((u: any) => [u.user_id, u.full_name]));
      const bookingsMap = new Map(bookingsData?.map((b: any) => [b.id, b.total_amount]));
      const transactionsMap = new Map(transactionsData?.map((t: any) => [t.booking_id, t.id]));

      const formattedDisputes = disputesData.map((dispute: any) => ({
        id: dispute.id.substring(0, 8),
        fullId: dispute.id,
        transactionId: transactionsMap.get(dispute.booking_id)?.substring(0, 8) || 'N/A',
        customer: usersMap.get(dispute.filed_by) || 'Unknown',
        amount: parseFloat(bookingsMap.get(dispute.booking_id)) || 0,
        status: dispute.status,
        date: dispute.created_at,
        reason: dispute.description,
        type: dispute.type,
      }));

      setDisputes(formattedDisputes);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      // Don't show error toast for disputes - it's not critical
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = transactionFilter === 'all' || tx.status === transactionFilter;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchTerm, transactionFilter]);

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      const matchesSearch =
        dispute.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = disputeFilter === 'all' || dispute.status === disputeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [disputes, searchTerm, disputeFilter]);

  const handleResolveDispute = useCallback(
    async () => {
      if (!selectedDispute) {
        return;
      }

      try {
        // Get current admin user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Admin user not found');
        }

        // Update dispute in database
        const { error: updateError } = await supabase
          .from('disputes')
          .update({
            status: 'resolved',
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            resolution: 'Resolved by admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDispute.fullId);

        if (updateError) throw updateError;

        toast({
          title: 'Dispute resolved',
          description: `Dispute ${selectedDispute.id} has been resolved successfully.`,
        });

        await auditService.logEvent({
          action: 'admin_resolve_dispute',
          entityType: 'dispute',
          entityId: selectedDispute.fullId,
          description: `Resolved dispute for transaction ${selectedDispute.transactionId}`,
          metadata: {
            customer: selectedDispute.customer,
            amount: selectedDispute.amount,
            status: selectedDispute.status,
            dateFiled: selectedDispute.date,
            type: selectedDispute.type,
          },
        });

        // Refresh disputes
        await fetchDisputes();
        setIsDialogOpen(false);
        setSelectedDispute(null);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to resolve dispute.',
          variant: 'destructive',
        });
      }
    },
    [selectedDispute, toast]
  );

  const openDisputeDetails = useCallback((dispute: any) => {
    setSelectedDispute(dispute);
    setIsDialogOpen(true);
  }, []);

  // Format currency in Ghana Cedis (GHS)
  const formatCurrency = formatGHSWithSymbol;

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Financial Monitor"
        text="Track revenue, transactions, and manage disputes."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-fluid-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From completed transactions</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-fluid-2xl font-bold">{formatCurrency(stats.totalFees)}</div>
            <p className="text-xs text-muted-foreground">Total fees collected</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-fluid-2xl font-bold">{stats.completedCount}</div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-fluid-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Disputes
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>All Transactions</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Button
                    onClick={() => exportToCSV(filteredTransactions, transactionExportColumns, 'transactions')}
                    variant="outline"
                    className="gap-2"
                    disabled={filteredTransactions.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      className="pl-8 w-full sm:w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="w-full overflow-x-auto">
                  <Table
                    maxHeight="calc(100vh - 25rem)"
                    onScrollContainerReady={setTransactionScrollElement}
                  >
                    <TableHeader sticky>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service/Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableSkeleton rows={8} cols={7} />
                    </TableBody>
                  </Table>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table
                    maxHeight="calc(100vh - 25rem)"
                    onScrollContainerReady={setTransactionScrollElement}
                  >
                    <TableHeader sticky>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service/Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <VirtualTableBody
                      items={filteredTransactions}
                      scrollElement={transactionScrollElement}
                      estimateSize={70}
                      threshold={30}
                      emptyMessage="No transactions found"
                      getRowKey={(tx) => tx.id}
                      renderRow={(tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{tx.id}</span>
                              {tx.reference && (
                                <span className="text-xs text-muted-foreground">
                                  {tx.reference}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{tx.customer}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {tx.service}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(tx.platformFee)}
                          </TableCell>
                          <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.status === 'completed'
                                  ? 'outline'
                                  : tx.status === 'processing'
                                    ? 'secondary'
                                    : tx.status === 'disputed'
                                      ? 'destructive'
                                      : 'default'
                              }
                              className={
                                tx.status === 'completed'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : ''
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )}
                    />
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Dispute Management</CardTitle>
                  <CardDescription>Review and resolve customer disputes</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search disputes..."
                      className="pl-8 w-full sm:w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={disputeFilter} onValueChange={setDisputeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="under review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="w-full overflow-x-auto">
                  <Table
                    maxHeight="calc(100vh - 20rem)"
                    onScrollContainerReady={setDisputeScrollElement}
                  >
                    <TableHeader sticky>
                      <TableRow>
                        <TableHead>Dispute ID</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Filed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableSkeleton rows={8} cols={7} />
                    </TableBody>
                  </Table>
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                  <p className="font-medium">No disputes found</p>
                  <p className="text-sm mt-1">All transactions are running smoothly</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table
                    maxHeight="calc(100vh - 20rem)"
                    onScrollContainerReady={setDisputeScrollElement}
                  >
                    <TableHeader sticky>
                      <TableRow>
                        <TableHead>Dispute ID</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Filed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <VirtualTableBody
                      items={filteredDisputes}
                      scrollElement={disputeScrollElement}
                      estimateSize={70}
                      threshold={30}
                      emptyMessage="No disputes found"
                      getRowKey={(dispute) => dispute.id}
                      renderRow={(dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-medium">{dispute.id}</TableCell>
                          <TableCell>{dispute.transactionId}</TableCell>
                          <TableCell>{dispute.customer}</TableCell>
                          <TableCell>{formatCurrency(dispute.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                dispute.status === 'resolved'
                                  ? 'outline'
                                  : dispute.status === 'under review'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {dispute.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(dispute.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDisputeDetails(dispute)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    />
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dispute Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Review the dispute information and take appropriate action.
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dispute ID</p>
                  <p>{selectedDispute.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction</p>
                  <p>{selectedDispute.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p>{selectedDispute.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p>{formatCurrency(selectedDispute.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedDispute.status === 'resolved'
                        ? 'outline'
                        : selectedDispute.status === 'under review'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {selectedDispute.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Filed</p>
                  <p>{new Date(selectedDispute.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Reason</p>
                <p className="text-sm">{selectedDispute.reason}</p>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Resolution Options</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    <span>Refund Amount</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Close Dispute</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveDispute}
              disabled={selectedDispute?.status === 'resolved'}
            >
              {selectedDispute?.status === 'resolved' ? 'Already Resolved' : 'Resolve Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TransactionsMonitor;
