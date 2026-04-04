import { useState } from 'react';
import { twoFactorService } from '@/services/two-factor';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TwoFactorVerifyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
  onVerified?: (data?: any) => void;
}

export const TwoFactorVerify = ({
  open,
  onOpenChange,
  token,
  onVerified,
}: TwoFactorVerifyProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const handleVerify = async () => {
    const value = useBackup ? backupCode.trim() : code;
    if (!value || (!useBackup && value.length !== 6)) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: useBackup
          ? 'Enter a valid backup code.'
          : 'Enter the 6-digit code from your authenticator app.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await twoFactorService.verifyCode(value, token);
      if (!result.success) {
        throw new Error('Invalid code');
      }

      toast({
        title: 'Two-factor verified',
        description: 'You have successfully completed two-factor verification.',
      });
      onOpenChange(false);
      if (onVerified) {
        onVerified(result.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error?.message || 'Unable to verify the code. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-factor verification</DialogTitle>
          <DialogDescription>
            Enter the code from your authenticator app or use a backup code to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!useBackup ? (
            <div className="space-y-2">
              <Label>Authentication code</Label>
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Backup code</Label>
              <Input
                value={backupCode}
                onChange={(event) => setBackupCode(event.target.value)}
                placeholder="Enter one of your backup codes"
              />
            </div>
          )}

          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2"
            onClick={() => setUseBackup(!useBackup)}
          >
            {useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}
          </button>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={isVerifying}>
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

