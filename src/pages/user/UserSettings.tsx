import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lock, Moon, Sun, Laptop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import notificationService from '@/services/notification';
import { supabase } from '@/lib/supabase';
import { paystackService } from '@/services/paystack';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PasswordRevealInput } from '@/components/ui/password-reveal-input';
import { authService } from '@/services/auth';

type UserSettingsRow = {
  email_notifications?: boolean | null;
  push_notifications?: boolean | null;
  booking_reminders?: boolean | null;
  message_notifications?: boolean | null;
  review_notifications?: boolean | null;
  marketing_emails?: boolean | null;
  login_notifications?: boolean | null;
  profile_public?: boolean | null;
  show_activity_status?: boolean | null;
};

const UserSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [bookingNotifications, setBookingNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [reviewNotifications, setReviewNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [hasSubaccount, setHasSubaccount] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [settlementBank, setSettlementBank] = useState('044');
  const [accountNumber, setAccountNumber] = useState('');
  const [isLinkingBank, setIsLinkingBank] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading settings:', error);
          return;
        }

        const row = data as UserSettingsRow | null;
        if (row) {
          setEmailNotifications(row.email_notifications ?? true);
          setPushNotifications(row.push_notifications ?? false);
          setBookingNotifications(row.booking_reminders ?? true);
          setMessageNotifications(row.message_notifications ?? true);
          setReviewNotifications(row.review_notifications ?? true);
          setMarketingEmails(row.marketing_emails ?? false);
          setLoginNotifications(row.login_notifications ?? true);
          setProfilePublic(row.profile_public ?? true);
          setShowActivityStatus(row.show_activity_status ?? true);
        }

        const { data: profile } = (await supabase
          .from('profiles')
          .select('paystack_subaccount, full_name')
          .eq('user_id', user.id)
          .single()) as { data: { paystack_subaccount?: string | null; full_name?: string | null } | null; error: unknown };

        if (profile) {
          setHasSubaccount(!!profile.paystack_subaccount);
          if (profile.full_name && !businessName) {
            setBusinessName(profile.full_name);
          }
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [user?.id]);

  const updateSetting = async (key: string, value: boolean, options?: { silent?: boolean }) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;

      if (!options?.silent) {
        toast({
          title: 'Settings updated',
          description: 'Your preferences have been saved.',
        });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
      });
    }
  };

  const handlePushNotificationToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await notificationService.requestNotificationPermission();

      if (granted) {
        setPushNotifications(true);
        await updateSetting('push_notifications', true, { silent: true });
        toast({
          title: 'Push notifications enabled',
          description: 'You will now receive push notifications.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
        });
      }
    } else {
      setPushNotifications(false);
      await updateSetting('push_notifications', false, { silent: true });
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    }
  };

  const handleLinkBank = async () => {
    if (!businessName || !settlementBank || !accountNumber) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please fill out all bank details to link your account.',
      });
      return;
    }

    setIsLinkingBank(true);
    try {
      await paystackService.createSubaccount({
        business_name: businessName,
        settlement_bank: settlementBank,
        account_number: accountNumber,
        percentage_charge: 15,
      });

      setHasSubaccount(true);
      toast({
        title: 'Bank Account Linked',
        description: 'Your account is now set up to automatically receive payouts.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to link bank',
        description: error instanceof Error ? error.message : 'Please check your account number and try again.',
      });
    } finally {
      setIsLinkingBank(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Use at least 8 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please enter the same password twice.',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.updatePassword(newPassword);
      toast({
        title: 'Password updated',
        description: 'Your new password is now active.',
      });
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update password',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <DashboardHeader
        heading="Settings"
        text="Manage your account preferences and security settings."
      />

      <div className="grid gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications about your bookings and messages
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  void updateSetting('email_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(c) => void handlePushNotificationToggle(c)}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleTheme()}
                className="h-9 w-9 shrink-0"
                title={theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Mode'}
              >
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Laptop className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {userRole === 'musician' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Payout Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Bank Account details</Label>
                <p className="text-sm text-muted-foreground">
                  {hasSubaccount
                    ? 'Your bank account is successfully linked. Payouts will be automatically routed to you.'
                    : 'Link your bank account to receive automatic payouts when a booking is completed.'}
                </p>
              </div>

              {!hasSubaccount && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="businessName">Account Name / Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. John Doe Music"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="bankCode">Bank code</Label>
                      <Input
                        id="bankCode"
                        value={settlementBank}
                        onChange={(e) => setSettlementBank(e.target.value)}
                        placeholder="e.g. 044"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="accountNumber">Account number</Label>
                      <Input
                        id="accountNumber"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="10 digit account number"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <Button onClick={() => void handleLinkBank()} disabled={isLinkingBank} className="mt-2 w-full">
                    {isLinkingBank ? 'Linking…' : 'Link Bank Account'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Login notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a sign-in is detected on your account (where supported)
                </p>
              </div>
              <Switch
                checked={loginNotifications}
                onCheckedChange={(checked) => {
                  setLoginNotifications(checked);
                  void updateSetting('login_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <Button variant="outline" className="w-full" type="button" onClick={() => setPasswordDialogOpen(true)}>
              <Lock className="mr-2 h-4 w-4" />
              Change password
            </Button>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Profile visibility</Label>
                <p className="text-sm text-muted-foreground">
                  When off, your profile is treated as private and hidden from discovery search
                </p>
              </div>
              <Switch
                checked={profilePublic}
                onCheckedChange={(checked) => {
                  setProfilePublic(checked);
                  void updateSetting('profile_public', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Activity status</Label>
                <p className="text-sm text-muted-foreground">
                  Show when you&apos;re active or recently online where the app supports it
                </p>
              </div>
              <Switch
                checked={showActivityStatus}
                onCheckedChange={(checked) => {
                  setShowActivityStatus(checked);
                  void updateSetting('show_activity_status', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>{userRole === 'musician' ? 'Booking requests' : 'Booking updates'}</Label>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'musician'
                    ? 'Get notified about new booking requests'
                    : 'Get notified about booking status and reminders'}
                </p>
              </div>
              <Switch
                checked={bookingNotifications}
                onCheckedChange={(checked) => {
                  setBookingNotifications(checked);
                  void updateSetting('booking_reminders', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Messages</Label>
                <p className="text-sm text-muted-foreground">Get notified about new messages</p>
              </div>
              <Switch
                checked={messageNotifications}
                onCheckedChange={(checked) => {
                  setMessageNotifications(checked);
                  void updateSetting('message_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Reviews</Label>
                <p className="text-sm text-muted-foreground">Get notified when you receive new reviews</p>
              </div>
              <Switch
                checked={reviewNotifications}
                onCheckedChange={(checked) => {
                  setReviewNotifications(checked);
                  void updateSetting('review_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label>Product updates</Label>
                <p className="text-sm text-muted-foreground">Occasional emails about Rhythm Guardian features and tips</p>
              </div>
              <Switch
                checked={marketingEmails}
                onCheckedChange={(checked) => {
                  setMarketingEmails(checked);
                  void updateSetting('marketing_emails', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Choose a strong password you haven&apos;t used elsewhere. You&apos;ll stay signed in on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordRevealInput
                id="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                showPassword={showNewPassword}
                onToggleShow={() => setShowNewPassword((s) => !s)}
                disabled={isUpdatingPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <PasswordRevealInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((s) => !s)}
                disabled={isUpdatingPassword}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={isUpdatingPassword}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleChangePassword()} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Saving…' : 'Update password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserSettings;
