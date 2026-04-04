import { useEffect, useState } from 'react';
import { twoFactorService } from '@/services/two-factor';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export const TwoFactorSetup = ({ open, onOpenChange, onCompleted }: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { siteName } = useSiteSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | undefined>(undefined);
  const [secretMasked, setSecretMasked] = useState<string | undefined>(undefined);
  const [backupCodes, setBackupCodes] = useState<string[] | undefined>(undefined);
  const [code, setCode] = useState('');

  const userEmail = user?.email || "";

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;
    const loadSetup = async () => {
      setIsLoading(true);
      setBackupCodes(undefined);
      try {
        const data = await twoFactorService.startSetup();
        if (!isActive) {
          return;
        }
        setQrCodeSvg(data.qrCodeSvg);
        setSecretMasked(data.secretMasked);
        setBackupCodes(data.backupCodes);
      } catch (error: any) {
        if (!isActive) {
          return;
        }
        toast({
          variant: 'destructive',
          title: 'Failed to start 2FA setup',
          description: error?.message || 'An unknown error occurred',
        });
        onOpenChange(false);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadSetup();

    return () => {
      isActive = false;
      setCode('');
    };
  }, [open, onOpenChange, toast]);

  const handleConfirm = async () => {
    if (code.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Enter the 6-digit code from your authenticator app.',
      });
      return;
    }

    setIsConfirming(true);
    try {
      await twoFactorService.confirmSetup(code);
      toast({
        title: 'Two-factor enabled',
        description: 'Two-factor authentication has been enabled for your account.',
      });
      onOpenChange(false);
      if (onCompleted) {
        onCompleted();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to confirm 2FA',
        description: error?.message || 'An unknown error occurred',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm border rounded-md p-3 bg-muted/50 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Site:</span>
              <span className="font-medium">{siteName}</span>
            </div>
            {userEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account:</span>
                <span className="font-medium">{userEmail}</span>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {isLoading ? (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Generating QR code...
                </div>
              ) : qrCodeSvg ? (
                <div className="flex items-center justify-center p-2 bg-white rounded-md">
                  {qrCodeSvg.startsWith('data:') ? (
                    <img src={qrCodeSvg} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Open your authenticator app and add a new account using the secret key below.
                </div>
              )}

              {secretMasked && (
                <div className="space-y-1">
                  <Label>Secret key</Label>
                  <Input value={secretMasked} readOnly />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Verification code</Label>
            <div className="flex justify-center">
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
          </div>

          {backupCodes && backupCodes.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Label>Backup codes</Label>
                <p className="text-xs text-muted-foreground">
                  Store these backup codes in a safe place. Each code can be used once if you lose
                  access to your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {backupCodes.map((backupCode) => (
                    <div
                      key={backupCode}
                      className="rounded border px-2 py-1 bg-muted text-center"
                    >
                      {backupCode}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming || isLoading}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
