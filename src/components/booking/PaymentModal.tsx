import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatGHSWithSymbol } from '@/lib/currency';
import { paystackService } from '@/services/paystack';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Building2, Smartphone, QrCode, Loader2 } from 'lucide-react';
import { getSettings } from '@/api/settings';
import { SessionManager } from '@/utils/session-manager';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    totalAmount: number;
    depositAmount: number;
    musician: {
      id?: string;
      name: string;
      instruments: string[];
    };
    event?: {
      type?: string;
      date?: string;
      location?: string;
    };
  };
  userId: string;
  userEmail: string;
  onPaymentSuccess: () => void;
}

const paymentChannels = [
  { value: 'card', label: 'Card', icon: CreditCard, description: 'Visa, Mastercard, Verve' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Transfer from your bank' },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, description: 'MTN, Vodafone, AirtelTigo' },
  { value: 'ussd', label: 'USSD', icon: QrCode, description: 'Dial *code# to pay' },
];

export function PaymentModal({
  open,
  onOpenChange,
  booking,
  userId,
  userEmail,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [allowedMethods, setAllowedMethods] = useState<string[] | null>(null);
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(10);

  useEffect(() => {
    const init = async () => {
      try {
        await paystackService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Paystack:', error);
        toast({
          variant: 'destructive',
          title: 'Payment Setup Error',
          description: 'Failed to initialize payment system. Please contact support.',
        });
      }
    };

    if (open && !isInitialized) {
      init();
    }
  }, [open, isInitialized, toast]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        
        const methods = settings.bookingPayments.paymentMethods;
        if (methods && methods.length > 0) {
          setAllowedMethods(methods);
          if (!methods.includes(selectedChannel)) {
            const fallback = methods[0] ?? 'card';
            setSelectedChannel(fallback);
          }
        } else {
          setAllowedMethods(null);
        }
        
        const feePercentage = settings.bookingPayments?.platformCommissionRate;
        if (typeof feePercentage === 'number' && feePercentage >= 0) {
          setPlatformFeePercentage(feePercentage);
        }
      } catch (error) {
        console.error('Failed to load booking payment settings', error);
        setAllowedMethods(null);
      }
    };

    if (open) {
      loadSettings();
    }
  }, [open, selectedChannel]);

  const enabledChannels =
    allowedMethods && allowedMethods.length > 0
      ? paymentChannels.filter((channel) => allowedMethods.includes(channel.value))
      : paymentChannels;

  const selectChannel = (channel: string) => {
    setSelectedChannel(channel);
  };

  const handlePayment = async () => {
    // Check for active session first
    const hasSession = await SessionManager.hasActiveSession();
    if (!hasSession) {
      const errorInfo = SessionManager.handleSessionError({ message: 'No active session' });
      toast({
        variant: 'destructive',
        title: errorInfo.title,
        description: errorInfo.message,
      });
      
      if (errorInfo.shouldRedirectToLogin) {
        onOpenChange(false);
        navigate('/login', { state: { from: window.location.pathname } });
      }
      return;
    }

    if (!isInitialized) {
      toast({
        variant: 'destructive',
        title: 'Payment Not Ready',
        description: 'Payment system is still initializing. Please wait a moment and try again.',
      });
      return;
    }

    if (!paystackService.isConfigured()) {
      console.log('PaymentModal: Paystack not configured, re-initializing...');
      try {
        await paystackService.initialize();
        setIsInitialized(true);
      } catch (e) {
        console.error('Re-init failed:', e);
        toast({
          variant: 'destructive',
          title: 'Payment Setup Error',
          description: 'Failed to initialize payment system. Please refresh the page and try again.',
        });
        return;
      }
    }

    if (!paystackService.isConfigured()) {
      toast({
        variant: 'destructive',
        title: 'Payment Not Configured',
        description: 'Payment system is not configured. Please ensure your public key is set in environment variables or database settings.',
      });
      return;
    }

    const activeChannel = enabledChannels.find((channel) => channel.value === selectedChannel);
    if (!activeChannel) {
      toast({
        variant: 'destructive',
        title: 'Payment Method Not Available',
        description: 'No payment method is currently enabled. Please contact the administrator.',
      });
      return;
    }

    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to process payment.',
      });
      return;
    }

    if (!userEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Missing',
        description: 'A valid email address is required for payment.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const reference = paystackService.generateReference();
      const totalToPay = booking.totalAmount;

      try {
        await paystackService.createTransaction({
          bookingId: booking.id,
          userId,
          amount: totalToPay,
          type: 'booking_payment',
          reference,
          status: 'pending',
          platformFee: platformCommission,
        });
      } catch (txError: any) {
        console.error('Failed to create transaction record:', txError);
        throw txError;
      }

      await paystackService.initializePayment({
        email: userEmail,
        amount: Math.round(totalToPay * 100),
        reference,
        channels: [selectedChannel] as any[],
        metadata: {
          bookingId: booking.id,
          type: 'full_payment',
          eventType: booking.event?.type || 'Event',
          musicianName: booking.musician.name,
        },
        callback: async (response) => {
          console.log('Payment callback received:', response);
          if (response.status === 'success') {
            try {
              console.log('Payment successful, verifying with server...');

              // Verify server-side: confirms the transaction is genuine and the
              // amount matches what we charged (prevents forged/partial-payment fraud).
              const expectedAmountPesewas = Math.round(totalToPay * 100);
              const verification = await paystackService.verifyTransaction(reference, expectedAmountPesewas);

              if (!verification.status || verification.data?.status !== 'success') {
                throw new Error(
                  verification.message || 'Server-side payment verification failed. Please contact support.'
                );
              }

              console.log('Server verification successful, updating booking...');

              const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({
                  payment_status: 'paid',
                  status: 'accepted',
                })
                .eq('id', booking.id);

              if (bookingUpdateError) {
                console.error('Failed to update booking:', bookingUpdateError);
                throw new Error('Failed to update booking status: ' + bookingUpdateError.message);
              }

              console.log('Booking updated successfully');

              // Update the existing pending transaction record (created before opening the popup)
              // instead of inserting a duplicate row.
              await paystackService.updateTransaction(reference, verification);

              toast({
                title: 'Payment Successful',
                description: `Your payment of ${formatGHSWithSymbol(totalToPay)} has been received.`,
              });

              onPaymentSuccess();
              onOpenChange(false);
            } catch (error: any) {
              console.error('Payment processing error:', error);
              const errorMessage = error?.message || 'Unknown error occurred';
              toast({
                variant: 'destructive',
                title: 'Payment Processing Failed',
                description: `${errorMessage}. Reference: ${reference}`,
              });
            }
          } else {
            console.error('Payment callback status not success:', response);
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: response.message || 'Your payment was not successful. Please try again.',
            });
          }
          setIsProcessing(false);
        },
        onClose: () => {
          setIsProcessing(false);
          toast({
            title: 'Payment Cancelled',
            description: 'You closed the payment window.',
          });
        },
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: error.message || error.details || 'Failed to process payment',
      });
      setIsProcessing(false);
    }
  };

  const platformCommission = booking.totalAmount * (platformFeePercentage / 100);
  const paystackFeePercentage = 1.5;
  const paystackFixedFee = 0.50;
  const paystackFee = (booking.totalAmount * (paystackFeePercentage / 100)) + paystackFixedFee;
  const totalDeductions = platformCommission + paystackFee;
  const musicianReceives = booking.totalAmount - totalDeductions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0">
        <div className="border-b px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg">Complete Your Booking Payment</DialogTitle>
            <DialogDescription className="text-sm">
              Complete your payment to secure your booking with {booking.musician.name}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Booking Details
            </h4>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Musician</span>
                <span className="font-medium">{booking.musician.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Event</span>
                <span>{booking.event?.type || 'Event'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>
                  {booking.event?.date
                    ? new Date(booking.event.date).toLocaleDateString()
                    : 'To be confirmed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="truncate max-w-[220px] text-right">
                  {booking.event?.location || 'To be confirmed'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Payment Breakdown
            </h4>
            <div className="rounded-xl border bg-background p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service Fee</span>
                <span className="font-medium">{formatGHSWithSymbol(booking.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Platform Fee ({platformFeePercentage}%)</span>
                <span className="text-red-600">-{formatGHSWithSymbol(platformCommission)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payment Processing Fee (Paystack)</span>
                <span className="text-red-600">-{formatGHSWithSymbol(paystackFee)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-muted-foreground font-medium">Musician Receives</span>
                <span className="font-semibold text-green-600">{formatGHSWithSymbol(musicianReceives)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold border-t pt-2 mt-2">
                <span>Total Amount Due</span>
                <span className="text-primary">{formatGHSWithSymbol(booking.totalAmount)}</span>
              </div>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Your payment will be held in escrow and released to the musician after the service is confirmed as completed by both parties. The musician will receive {formatGHSWithSymbol(musicianReceives)} after platform and payment processing fees.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Select Payment Methods
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {enabledChannels.map((channel) => {
                const Icon = channel.icon;
                const isSelected = selectedChannel === channel.value;
                return (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => selectChannel(channel.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 bg-background p-3 text-sm transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <div className="text-center space-y-0.5">
                      <div className="font-medium text-sm">{channel.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {channel.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="gap-1 px-2 py-1 text-[11px]">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Secured by Paystack
            </Badge>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing || !isInitialized}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatGHSWithSymbol(booking.totalAmount)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}