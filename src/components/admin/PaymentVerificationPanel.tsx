import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { formatGHSWithSymbol } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { ManualPayoutButton } from './ManualPayoutButton';
import { getSettings } from '@/api/settings';

interface PaymentVerificationPanelProps {
  bookingId: string;
}

// Bank code to full name mapping
const BANK_NAMES: Record<string, string> = {
  'GCB': 'GCB Bank',
  'SCB': 'Standard Chartered Bank',
  'CAL': 'CAL Bank',
  'ADB': 'Agricultural Development Bank',
  'FBL': 'Fidelity Bank',
  'EBG': 'Ecobank Ghana',
  'GTB': 'Guaranty Trust Bank',
  'ZBL': 'Zenith Bank',
  'ABG': 'Access Bank Ghana',
  'UBA': 'United Bank for Africa',
  'SBG': 'Stanbic Bank',
  'PBL': 'Prudential Bank',
};

export function PaymentVerificationPanel({ bookingId }: PaymentVerificationPanelProps) {
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platformCommissionRate, setPlatformCommissionRate] = useState(10);
  const { toast } = useToast();

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
    fetchPaymentInfo();
  }, [bookingId]);

  const fetchPaymentInfo = async () => {
    setIsLoading(true);
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Booking error:', bookingError);
        throw new Error(`Failed to load booking: ${bookingError.message}`);
      }

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Get hirer profile
      const { data: hirerProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', booking.hirer_id || '')
        .single();

      // Get musician profile
      const { data: musicianProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', booking.musician_id || '')
        .single();

      // Attach profiles to booking
      const bookingWithProfiles = {
        ...booking,
        hirer: hirerProfile,
        musician: musicianProfile,
      };

      // Get all transactions for this booking
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Transactions error:', txError);
      }

      // Get musician's payment details from profiles - only select existing columns
      const { data: paymentProfile, error: paymentDetailsError } = await supabase
        .from('profiles')
        .select('bank_account_number, bank_code, bank_account_name, mobile_money_number, mobile_money_provider')
        .eq('user_id', booking.musician_id || '')
        .maybeSingle();

      console.log('Musician ID:', booking.musician_id);
      console.log('Payment profile data:', paymentProfile);
      console.log('Payment details error:', paymentDetailsError);

      if (paymentDetailsError) {
        console.error('Payment details error:', paymentDetailsError);
      }

      // Check if musician has ANY payment method configured
      const hasPaymentDetails = paymentProfile && (
        paymentProfile.bank_account_number || 
        paymentProfile.mobile_money_number
      );

      const paymentDetails = hasPaymentDetails ? {
        bank_name: paymentProfile.bank_code ? BANK_NAMES[paymentProfile.bank_code] || paymentProfile.bank_code : 'Not specified',
        bank_code: paymentProfile.bank_code,
        account_number: paymentProfile.bank_account_number,
        account_name: paymentProfile.bank_account_name || 'Account name not provided - Please update payment details',
        mobile_money_number: paymentProfile.mobile_money_number,
        mobile_money_provider: paymentProfile.mobile_money_provider,
        mobile_money_name: paymentProfile.bank_account_name || 'Account name not provided - Please update payment details', // Use bank_account_name for mobile money too
      } : null;

      console.log('Has payment details:', hasPaymentDetails);
      console.log('Processed payment details:', paymentDetails);

      // Get payout records
      const { data: payouts, error: payoutError } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('type', 'payout')
        .order('created_at', { ascending: false });

      if (payoutError) {
        console.error('Payouts error:', payoutError);
      }

      setPaymentInfo({
        booking: bookingWithProfiles,
        transactions: transactions || [],
        payouts: payouts || [],
        paymentDetails: paymentDetails,
      });
    } catch (error: any) {
      console.error('Error fetching payment info:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load payment information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPaystackTransaction = async (reference: string) => {
    try {
      // Open Paystack dashboard in new tab
      window.open(`https://dashboard.paystack.com/#/transactions/${reference}`, '_blank');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <div className="text-center p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">No payment information available</p>
      </div>
    );
  }

  const { booking, transactions, payouts, paymentDetails } = paymentInfo;
  const latestTransaction = transactions[0];

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPaymentInfo}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Musician Payment Details */}
      {paymentDetails && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Payment Details</CardTitle>
            <CardDescription className="dark:text-blue-200">Use these details to manually transfer funds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Bank Account Section */}
            {paymentDetails.account_number && (
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-sm font-semibold text-gray-700">Bank Account</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Bank Name</p>
                    <p className="font-medium text-gray-900">{paymentDetails.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Account Name</p>
                    <p className={`font-medium ${paymentDetails.account_name.includes('not provided') ? 'text-red-700 bg-red-50 px-3 py-2 rounded-md border border-red-200 text-sm' : 'text-gray-900'}`}>
                      {paymentDetails.account_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Account Number</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{paymentDetails.account_number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Money Section */}
            {paymentDetails.mobile_money_number && (
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-sm font-semibold text-gray-700">Mobile Money</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Provider</p>
                    <p className="font-medium text-gray-900">
                      {paymentDetails.mobile_money_provider === 'MTN' && 'MTN Mobile Money'}
                      {paymentDetails.mobile_money_provider === 'VOD' && 'Vodafone Cash'}
                      {paymentDetails.mobile_money_provider === 'ATL' && 'AirtelTigo Money'}
                      {!paymentDetails.mobile_money_provider && (
                        <span className="text-red-700 bg-red-50 px-3 py-2 rounded-md border border-red-200 text-sm">
                          Provider not specified - Please update payment details
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Account Name</p>
                    <p className={`font-medium ${paymentDetails.mobile_money_name.includes('not provided') ? 'text-red-700 bg-red-50 px-3 py-2 rounded-md border border-red-200 text-sm' : 'text-gray-900'}`}>
                      {paymentDetails.mobile_money_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Mobile Number</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{paymentDetails.mobile_money_number}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ Verify these details before making any transfer. Contact musician if details seem incorrect.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!paymentDetails && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-100">No Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800 dark:text-red-200">
              Musician has not added their bank account details yet. They need to complete their payment setup before you can release funds.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Financial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Breakdown</CardTitle>
          <CardDescription>Detailed fee calculation for this booking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const totalAmount = parseFloat(booking.total_amount) || 0;
            
            // Use admin-configured platform commission rate
            const platformFee = totalAmount * (platformCommissionRate / 100);
            
            // Paystack fees: 1.5% + GHS 0.50
            const paystackFeePercentage = 1.5;
            const paystackFixedFee = 0.50;
            const paystackFee = (totalAmount * (paystackFeePercentage / 100)) + paystackFixedFee;
            
            // Calculate musician payout
            const totalFees = platformFee + paystackFee;
            const musicianPayout = totalAmount - totalFees;

            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-base">Total Amount Paid</span>
                  <span className="font-bold text-xl text-green-700 dark:text-green-400">{formatGHSWithSymbol(totalAmount)}</span>
                </div>
                
                <div className="space-y-2 px-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Platform Fee ({platformCommissionRate}%)</span>
                    <span className="text-red-600 dark:text-red-400">-{formatGHSWithSymbol(platformFee)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Payment Processing Fee (Paystack)</span>
                    <span className="text-red-600 dark:text-red-400">-{formatGHSWithSymbol(paystackFee)}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                    {paystackFeePercentage}% + GHS {paystackFixedFee.toFixed(2)} per transaction
                  </div>
                </div>

                <Separator />
                
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="font-medium text-blue-800 dark:text-blue-200">Musician Payout</span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatGHSWithSymbol(musicianPayout)}</span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Platform keeps:</span>
                      <span>{((platformFee / totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment processor:</span>
                      <span>{((paystackFee / totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-800 dark:text-gray-200">
                      <span>Musician receives:</span>
                      <span>{((musicianPayout / totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Payment verification information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Hirer</p>
              <p className="font-medium">{booking.hirer?.full_name}</p>
              <p className="text-sm text-gray-500">{booking.hirer?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Musician</p>
              <p className="font-medium">{booking.musician?.full_name}</p>
              <p className="text-sm text-gray-500">{booking.musician?.email}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-lg font-bold">{formatGHSWithSymbol(booking.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                {booking.payment_status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payout Status</p>
              <Badge variant={booking.payout_released ? 'default' : 'secondary'}>
                {booking.payout_released ? 'Released' : 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>Hirer's payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions found</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tx.status === 'paid' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : tx.status === 'pending' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">{formatGHSWithSymbol(tx.amount)}</span>
                    </div>
                    <Badge>{tx.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Reference:</span>
                      <p className="font-mono text-xs">{tx.paystack_reference}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Method:</span>
                      <p>{tx.payment_method || 'Card'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Platform Fee:</span>
                      <p>{formatGHSWithSymbol(tx.platform_fee || 0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Net Amount:</span>
                      <p className="font-medium">{formatGHSWithSymbol(tx.net_amount || tx.amount)}</p>
                    </div>
                  </div>

                  {tx.paystack_reference && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyPaystackTransaction(tx.paystack_reference)}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Verify on Paystack Dashboard
                    </Button>
                  )}

                  <p className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Records */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Records</CardTitle>
          <CardDescription>Payments to musician</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No payouts processed yet</p>
              {latestTransaction?.status === 'paid' && (
                <p className="text-xs text-gray-400 mt-1">
                  Payment received - ready for payout release
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout: any) => (
                <div key={payout.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatGHSWithSymbol(payout.amount)}</span>
                    <Badge>{payout.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Reference:</span>
                      <p className="font-mono text-xs">{payout.reference}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Method:</span>
                      <p>{payout.payout_method || 'Bank Transfer'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    {new Date(payout.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Summary */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Verification Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Payment Received:</span>
            {latestTransaction?.status === 'paid' ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">No</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Service Confirmed:</span>
            {booking.service_confirmed_by_hirer && booking.service_confirmed_by_musician ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pending</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Payout Released:</span>
            {booking.payout_released ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">No</span>
              </div>
            )}
          </div>

          <Separator className="my-3" />

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ready for Manual Release?</p>
            {latestTransaction?.status === 'paid' &&
            !booking.payout_released &&
            booking.service_confirmed_by_hirer &&
            booking.service_confirmed_by_musician ? (
              <>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-3">
                  ✓ All conditions met - safe to release
                </p>
                <ManualPayoutButton
                  bookingId={bookingId}
                  musicianId={booking.musician_id}
                  amount={(() => {
                    const totalAmount = parseFloat(booking.total_amount) || 0;
                    const platformFee = totalAmount * (platformCommissionRate / 100);
                    const paystackFee = (totalAmount * 0.015) + 0.50;
                    return totalAmount - platformFee - paystackFee;
                  })()}
                  onSuccess={fetchPaymentInfo}
                />
              </>
            ) : (
              <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">⚠ Waiting for confirmations</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
