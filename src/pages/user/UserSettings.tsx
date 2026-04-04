import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Lock, Moon, Sun, User, Laptop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import notificationService from '@/services/notification';
import { supabase } from '@/lib/supabase';
import { paystackService } from '@/services/paystack';
import { Input } from '@/components/ui/input';

const UserSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [bookingNotifications, setBookingNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [reviewNotifications, setReviewNotifications] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Paystack Subaccount State
  const [hasSubaccount, setHasSubaccount] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [settlementBank, setSettlementBank] = useState('044'); // Default to Access Bank or similar code depending on your region
  const [accountNumber, setAccountNumber] = useState('');
  const [isLinkingBank, setIsLinkingBank] = useState(false);

  // Load user settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading settings:', error);
          return;
        }

        if (data) {
          setEmailNotifications(data.email_notifications ?? true);
          setPushNotifications(data.push_notifications ?? false);
          setBookingNotifications(data.booking_reminders ?? true);
          setMessageNotifications(data.message_notifications ?? true);
          setReviewNotifications(data.review_notifications ?? true);
        }

        // Load profile to check for subaccount
        // Using as any to bypass strict Database type checking for the new paystack_subaccount column
        const { data: profile } = await supabase
          .from('profiles')
          .select('paystack_subaccount, full_name')
          .eq('user_id', user.id)
          .single() as { data: any, error: any };

        if (profile) {
          setHasSubaccount(!!profile.paystack_subaccount);
          if (profile.full_name && !businessName) {
            setBusinessName(profile.full_name);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const updateSetting = async (key: string, value: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been saved.',
      });
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
      // Request permission first
      const granted = await notificationService.requestNotificationPermission();
      
      if (granted) {
        setPushNotifications(true);
        await updateSetting('push_notifications', true);
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
      await updateSetting('push_notifications', false);
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
        percentage_charge: 15, // Platform fee percentage (15%)
      });

      setHasSubaccount(true);
      toast({
        title: 'Bank Account Linked',
        description: 'Your account is now set up to automatically receive payouts.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to link bank',
        description: error?.message || 'Please check your account number and try again.',
      });
    } finally {
      setIsLinkingBank(false);
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications about your bookings and messages
                </p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  updateSetting('email_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch 
                checked={pushNotifications}
                onCheckedChange={handlePushNotificationToggle}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                title={
                  theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Mode'
                }
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

        {(user as any)?.user_metadata?.role === 'musician' && (
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bankCode">Bank Code</Label>
                      {/* Ideally this would be a select dropdown of supported banks from Paystack API */}
                      <Input 
                        id="bankCode" 
                        value={settlementBank} 
                        onChange={(e) => setSettlementBank(e.target.value)} 
                        placeholder="e.g. 044" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input 
                        id="accountNumber" 
                        value={accountNumber} 
                        onChange={(e) => setAccountNumber(e.target.value)} 
                        placeholder="10 digit account number" 
                        maxLength={10}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleLinkBank} 
                    disabled={isLinkingBank}
                    className="w-full mt-2"
                  >
                    {isLinkingBank ? "Linking..." : "Link Bank Account"}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Login Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone logs into your account
                </p>
              </div>
              <Switch />
            </div>

            <Button variant="outline" className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Control who can see your profile information
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activity Status</Label>
                <p className="text-sm text-muted-foreground">
                  Show when you're active on the platform
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Button variant="outline" className="w-full">
              <User className="mr-2 h-4 w-4" />
              Manage Privacy Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new booking requests
                </p>
              </div>
              <Switch 
                checked={bookingNotifications}
                onCheckedChange={(checked) => {
                  setBookingNotifications(checked);
                  updateSetting('booking_reminders', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Messages</Label>
                <p className="text-sm text-muted-foreground">Get notified about new messages</p>
              </div>
              <Switch 
                checked={messageNotifications}
                onCheckedChange={(checked) => {
                  setMessageNotifications(checked);
                  updateSetting('message_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive new reviews
                </p>
              </div>
              <Switch 
                checked={reviewNotifications}
                onCheckedChange={(checked) => {
                  setReviewNotifications(checked);
                  updateSetting('review_notifications', checked);
                }}
                disabled={isLoadingSettings}
              />
            </div>

            <Button variant="outline" className="w-full">
              <Bell className="mr-2 h-4 w-4" />
              Manage Notification Preferences
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default UserSettings;
