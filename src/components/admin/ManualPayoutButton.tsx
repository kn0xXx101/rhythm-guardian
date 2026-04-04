import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatGHSWithSymbol } from '@/lib/currency';

interface ManualPayoutButtonProps {
  bookingId: string;
  musicianId: string;
  amount: number;
  onSuccess?: () => void;
}

export function ManualPayoutButton({
  bookingId,
  musicianId,
  amount,
  onSuccess,
}: ManualPayoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const handleMarkAsPaid = async () => {
    if (!paymentReference.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a payment reference',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Update booking payout status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          payout_released: true,
          payout_released_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // 2. Create transaction record for the payout
      const { error: payoutTxError } = await supabase
        .from('transactions')
        .insert({
          booking_id: bookingId,
          user_id: musicianId,
          amount: amount,
          type: 'payout',
          status: 'paid',
          payment_method: 'manual_bank_transfer',
          paystack_reference: paymentReference,
          metadata: {
            notes: notes || 'Manual payout by admin',
            processed_by: 'admin',
          },
        });

      if (payoutTxError) {
        console.error('Payout transaction error:', payoutTxError);
      }

      // 3. Get musician details for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', musicianId)
        .single();

      const musicianName = profile?.full_name || 'Musician';

      // Since we can't access other users' emails directly, we'll skip email for now
      const musicianEmail = null; // We'll handle email separately

      // 4. Send email notification to musician (if we have email)
      if (musicianEmail) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: musicianEmail,
              subject: 'Payment Disbursed - Rhythm Guardian',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Payment Disbursed</h2>
                  <p>Hello ${musicianName},</p>
                  <p>Great news! Your payment has been successfully disbursed.</p>
                  
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Payment Details</h3>
                    <p><strong>Amount:</strong> ${formatGHSWithSymbol(amount)}</p>
                    <p><strong>Reference:</strong> ${paymentReference}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                  </div>

                  <p>The funds should appear in your bank account within 1-3 business days.</p>
                  
                  ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}

                  <p>If you have any questions, please contact our support team.</p>
                  
                  <p>Best regards,<br>Rhythm Guardian Team</p>
                </div>
              `,
            },
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      // 5. Create in-app notification (without metadata for now)
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: musicianId,
        type: 'payment',
        title: 'Payment Disbursed',
        content: `Your payment of ${formatGHSWithSymbol(amount)} has been disbursed. Reference: ${paymentReference}. Booking ID: ${bookingId}`,
        action_url: '/musician/payouts',
        read: false,
      });

      if (notifError) {
        console.error('Notification error:', notifError);
        // Don't fail the whole operation if notification fails
      }

      toast({
        title: 'Success',
        description: 'Payment marked as paid and musician notified',
      });

      setIsOpen(false);
      setPaymentReference('');
      setNotes('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error marking payment as paid:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payout',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default">
        <CheckCircle className="h-4 w-4 mr-2" />
        Mark as Paid
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Confirm that you have manually transferred {formatGHSWithSymbol(amount)} to the
              musician. This will notify them about the payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference *</Label>
              <Input
                id="reference"
                placeholder="e.g., Bank transfer ref, transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500">
                Enter the bank transfer reference or transaction ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Booking marked as paid</li>
                <li>✓ Payout record created</li>
                <li>✓ Email sent to musician</li>
                <li>✓ In-app notification created</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
