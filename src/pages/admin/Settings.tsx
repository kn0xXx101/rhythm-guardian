import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { getSettings, updateSettings } from '@/api/settings';
import { scheduleFullReload } from '@/utils/schedule-full-reload';
import { useTheme } from '@/contexts/ThemeContext';
import type { Settings } from '@/types/settings';
import { auditService } from '@/services/audit';

const defaultSettings: Settings = {
  general: {
    siteName: 'Rhythm Guardian',
    siteDescription: 'Connect with talented musicians and find the perfect sound for your event.',
    adminEmail: '',
    timezone: 'UTC',
    maintenanceMode: false,
  },
  security: {
    twoFactorEnabled: false,
    emailVerificationRequired: true,
    sessionTimeout: 30,
    passwordPolicy: 'medium',
  },
  notifications: {
    emailNotifications: true,
    adminAlerts: true,
    systemUpdates: true,
    notificationEmail: '',
  },
  appearance: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    darkMode: false,
    fontFamily: 'inter',
    ambientIntensity: 'medium',
  },
  integrations: {
    paystackPublicKey: '',
    googleAnalyticsId: '',
    smtpServer: '',
    enableAnalytics: true,
  },
  userManagement: {
    autoApproveHirers: true,
    requireMusicianVerification: true,
    allowSelfRegistration: true,
    maxProfileImages: 5,
    requirePhoneVerification: false,
    minimumAge: 18,
    profileCompletionRequired: true,
    backgroundCheckRequired: false,
  },
  bookingPayments: {
    platformCommissionRate: 15,
    minimumBookingAmount: 50,
    maximumBookingAmount: 10000,
    allowInstantBooking: true,
    requireDepositPayment: true,
    depositPercentage: 25,
    cancellationWindow: 24,
    refundPolicy: 'partial',
    paymentMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
    currencyCode: 'GHS',
  },
  chatCommunication: {
    messagingEnabled: true,
    enableAutoModeration: true,
    profanityFilterEnabled: true,
    maxMessageLength: 1000,
    allowFileSharing: true,
    allowVoiceMessages: true,
    chatHistoryRetention: 365,
    flaggedContentThreshold: 3,
    autoMuteRepeatedOffenders: true,
    moderatorNotifications: true,
  },
  contentModeration: {
    autoContentReview: true,
    aiModerationEnabled: true,
    reportingThreshold: 5,
    autoSuspendThreshold: 10,
    reviewQueueLimit: 100,
    moderatorAssignmentAuto: true,
    contentApprovalRequired: false,
    imageRecognitionEnabled: true,
    textAnalysisEnabled: true,
  },
  analyticsReporting: {
    dataRetentionPeriod: 730,
    enableUserAnalytics: true,
    enablePerformanceTracking: true,
    generateDailyReports: true,
    generateWeeklyReports: true,
    generateMonthlyReports: true,
    exportDataEnabled: true,
    anonymizeUserData: true,
    trackingCookiesEnabled: true,
  },
  platformPolicies: {
    termsOfServiceVersion: '1.0',
    privacyPolicyVersion: '1.0',
    cancellationPolicy: 'moderate',
    disputeResolutionPeriod: 14,
    maximumDisputePeriod: 60,
    automaticRefundEnabled: false,
    serviceGuaranteeEnabled: true,
    qualityAssuranceEnabled: true,
    complianceReportingEnabled: true,
  },
  systemMonitoring: {
    uptimeMonitoringEnabled: true,
    performanceAlertsEnabled: true,
    errorThreshold: 5,
    responseTimeThreshold: 2000,
    diskSpaceAlertThreshold: 85,
    memoryUsageAlertThreshold: 80,
    databaseMonitoringEnabled: true,
    securityScanningEnabled: true,
    backupFrequency: 'daily',
    logRetentionPeriod: 90,
  },
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'general';
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const { applyTheme } = useTheme();

  // Initialize with theme context settings
  useEffect(() => {
    // Load settings from API
    const loadSettings = async () => {
      try {
        const fetchedSettings = await getSettings();
        setSettings(fetchedSettings);
        applyTheme(fetchedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings. Using default values.',
          variant: 'destructive',
        });
      }
    };
    loadSettings();
  }, [applyTheme]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSettings(settings);
      applyTheme(settings);

      toast({
        title: 'Settings saved',
        description: 'Your changes have been saved successfully.',
      });
      scheduleFullReload(600);

      try {
        await auditService.logEvent({
          action: 'admin_update_settings',
          entityType: 'settings',
          description: 'Updated platform settings from admin dashboard',
          metadata: {
            sectionsUpdated: Object.keys(settings),
          },
        });
      } catch (auditError) {
        console.error('Failed to log settings update:', auditError);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply theme changes in real-time for appearance settings
  const handleAppearanceChange = (newSettings: Settings) => {
    setSettings(newSettings);
    // Apply theme immediately for preview
    applyTheme(newSettings);
  };

  const handleReset = async () => {
    setSettings(defaultSettings);
    applyTheme(defaultSettings);
    toast({
      title: 'Settings reset',
      description: 'Settings have been reset to default values.',
    });

    try {
      await auditService.logEvent({
        action: 'admin_reset_settings',
        entityType: 'settings',
        description: 'Reset platform settings to defaults from admin dashboard',
      });
    } catch (auditError) {
      console.error('Failed to log settings reset:', auditError);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Settings"
        text="Manage your application settings and configurations."
      />

      <Tabs value={tabParam} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-4">
        <TabsList className="flex w-full h-auto min-h-10 overflow-x-auto overflow-y-hidden justify-start p-1 lg:grid lg:grid-cols-12 lg:h-10">
          <TabsTrigger value="general" className="whitespace-nowrap">General</TabsTrigger>
          <TabsTrigger value="security" className="whitespace-nowrap">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="whitespace-nowrap">Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="whitespace-nowrap">Appearance</TabsTrigger>
          <TabsTrigger value="integrations" className="whitespace-nowrap">Integrations</TabsTrigger>
          <TabsTrigger value="userManagement" className="whitespace-nowrap">Users</TabsTrigger>
          <TabsTrigger value="bookingPayments" className="whitespace-nowrap">Bookings</TabsTrigger>
          <TabsTrigger value="chatCommunication" className="whitespace-nowrap">Chat</TabsTrigger>
          <TabsTrigger value="contentModeration" className="whitespace-nowrap">Moderation</TabsTrigger>
          <TabsTrigger value="analyticsReporting" className="whitespace-nowrap">Analytics</TabsTrigger>
          <TabsTrigger value="platformPolicies" className="whitespace-nowrap">Policies</TabsTrigger>
          <TabsTrigger value="systemMonitoring" className="whitespace-nowrap">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site Name</Label>
                <Input
                  id="site-name"
                  value={settings.general.siteName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, siteName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-description">Site Description</Label>
                <Textarea
                  id="site-description"
                  value={settings.general.siteDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, siteDescription: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={settings.general.adminEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, adminEmail: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select
                  value={settings.general.timezone}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, timezone: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">EST</SelectItem>
                    <SelectItem value="PST">PST</SelectItem>
                    <SelectItem value="GMT">GMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenance-mode"
                  checked={settings.general.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, maintenanceMode: checked },
                    })
                  }
                />
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="two-factor"
                  checked={settings.security.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactorEnabled: checked },
                    })
                  }
                />
                <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-verification"
                  checked={settings.security.emailVerificationRequired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, emailVerificationRequired: checked },
                    })
                  }
                />
                <Label htmlFor="email-verification">Require Email Verification</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeout: value },
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-policy">Password Policy</Label>
                <Select
                  value={settings.security.passwordPolicy}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, passwordPolicy: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select password policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (8+ characters)</SelectItem>
                    <SelectItem value="medium">Medium (12+ characters, numbers)</SelectItem>
                    <SelectItem value="high">High (16+ characters, numbers, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailNotifications: checked },
                    })
                  }
                />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="admin-alerts"
                  checked={settings.notifications.adminAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, adminAlerts: checked },
                    })
                  }
                />
                <Label htmlFor="admin-alerts">Admin Alerts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="system-updates"
                  checked={settings.notifications.systemUpdates}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, systemUpdates: checked },
                    })
                  }
                />
                <Label htmlFor="system-updates">System Update Notifications</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <Input
                  id="notification-email"
                  type="email"
                  value={settings.notifications.notificationEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        notificationEmail: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.appearance.primaryColor}
                  onChange={(e) =>
                    handleAppearanceChange({
                      ...settings,
                      appearance: { ...settings.appearance, primaryColor: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.appearance.secondaryColor}
                  onChange={(e) =>
                    handleAppearanceChange({
                      ...settings,
                      appearance: { ...settings.appearance, secondaryColor: e.target.value },
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="dark-mode"
                  checked={settings.appearance.darkMode}
                  onCheckedChange={(checked) =>
                    handleAppearanceChange({
                      ...settings,
                      appearance: { ...settings.appearance, darkMode: checked },
                    })
                  }
                />
                <Label htmlFor="dark-mode">Default Dark Mode</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select
                  value={settings.appearance.fontFamily}
                  onValueChange={(value) =>
                    handleAppearanceChange({
                      ...settings,
                      appearance: { ...settings.appearance, fontFamily: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font family" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                    <SelectItem value="poppins">Poppins</SelectItem>
                    <SelectItem value="righteous">Righteous</SelectItem>
                    <SelectItem value="fredoka">Fredoka</SelectItem>
                    <SelectItem value="baloo-tamma">Baloo Tamma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ambient-intensity">Homepage Ambient Intensity</Label>
                <Select
                  value={settings.appearance.ambientIntensity}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    handleAppearanceChange({
                      ...settings,
                      appearance: { ...settings.appearance, ambientIntensity: value },
                    })
                  }
                >
                  <SelectTrigger id="ambient-intensity">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (subtle)</SelectItem>
                    <SelectItem value="medium">Medium (balanced)</SelectItem>
                    <SelectItem value="high">High (rich)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>Manage third-party integrations and API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paystack-key">Paystack Public Key</Label>
                <Input
                  id="paystack-key"
                  type="password"
                  placeholder="pk_live_..."
                  value={settings.integrations.paystackPublicKey}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      integrations: { ...settings.integrations, paystackPublicKey: e.target.value },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Get your Paystack public key from your{' '}
                  <a
                    href="https://dashboard.paystack.com/#/settings/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Paystack Dashboard
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-analytics">Google Analytics ID</Label>
                <Input
                  id="google-analytics"
                  value={settings.integrations.googleAnalyticsId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      integrations: { ...settings.integrations, googleAnalyticsId: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-server">SMTP Server</Label>
                <Input
                  id="smtp-server"
                  value={settings.integrations.smtpServer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      integrations: { ...settings.integrations, smtpServer: e.target.value },
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-analytics"
                  checked={settings.integrations.enableAnalytics}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      integrations: { ...settings.integrations, enableAnalytics: checked },
                    })
                  }
                />
                <Label htmlFor="enable-analytics">Enable Analytics</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="userManagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management Settings</CardTitle>
              <CardDescription>
                Configure user registration, verification, and profile requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-approve-hirers"
                  checked={settings.userManagement.autoApproveHirers}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: { ...settings.userManagement, autoApproveHirers: checked },
                    })
                  }
                />
                <Label htmlFor="auto-approve-hirers">Auto-approve Hirer Registrations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-musician-verification"
                  checked={settings.userManagement.requireMusicianVerification}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        requireMusicianVerification: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="require-musician-verification">Require Musician Verification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-self-registration"
                  checked={settings.userManagement.allowSelfRegistration}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        allowSelfRegistration: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="allow-self-registration">Allow Self Registration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-phone-verification"
                  checked={settings.userManagement.requirePhoneVerification}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        requirePhoneVerification: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="require-phone-verification">Require Phone Verification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="profile-completion-required"
                  checked={settings.userManagement.profileCompletionRequired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        profileCompletionRequired: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="profile-completion-required">Require Complete Profile</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="background-check-required"
                  checked={settings.userManagement.backgroundCheckRequired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        backgroundCheckRequired: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="background-check-required">Require Background Check</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="max-profile-images">Maximum Profile Images</Label>
                <Input
                  id="max-profile-images"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.userManagement.maxProfileImages}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        maxProfileImages: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimum-age">Minimum Age Requirement</Label>
                <Input
                  id="minimum-age"
                  type="number"
                  min="13"
                  max="25"
                  value={settings.userManagement.minimumAge}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      userManagement: {
                        ...settings.userManagement,
                        minimumAge: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookingPayments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking & Payment Settings</CardTitle>
              <CardDescription>
                Configure booking policies, payment processing, and commission rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-commission">Platform Commission Rate (%)</Label>
                <Input
                  id="platform-commission"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={settings.bookingPayments.platformCommissionRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setSettings({
                      ...settings,
                      bookingPayments: {
                        ...settings.bookingPayments,
                        platformCommissionRate: value,
                      },
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-booking-amount">Minimum Booking Amount</Label>
                  <Input
                    id="min-booking-amount"
                    type="number"
                    min="0"
                    value={settings.bookingPayments.minimumBookingAmount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookingPayments: {
                          ...settings.bookingPayments,
                          minimumBookingAmount: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-booking-amount">Maximum Booking Amount</Label>
                  <Input
                    id="max-booking-amount"
                    type="number"
                    min="0"
                    value={settings.bookingPayments.maximumBookingAmount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookingPayments: {
                          ...settings.bookingPayments,
                          maximumBookingAmount: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-instant-booking"
                  checked={settings.bookingPayments.allowInstantBooking}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      bookingPayments: {
                        ...settings.bookingPayments,
                        allowInstantBooking: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="allow-instant-booking">Allow Instant Booking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-deposit"
                  checked={settings.bookingPayments.requireDepositPayment}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      bookingPayments: {
                        ...settings.bookingPayments,
                        requireDepositPayment: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="require-deposit">Require Deposit Payment</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-percentage">Deposit Percentage (%)</Label>
                <Input
                  id="deposit-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.bookingPayments.depositPercentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bookingPayments: {
                        ...settings.bookingPayments,
                        depositPercentage: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancellation-window">Cancellation Window (hours)</Label>
                <Input
                  id="cancellation-window"
                  type="number"
                  min="0"
                  value={settings.bookingPayments.cancellationWindow}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bookingPayments: {
                        ...settings.bookingPayments,
                        cancellationWindow: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-policy">Refund Policy</Label>
                <Select
                  value={settings.bookingPayments.refundPolicy}
                  onValueChange={(value: 'full' | 'partial' | 'none') =>
                    setSettings({
                      ...settings,
                      bookingPayments: { ...settings.bookingPayments, refundPolicy: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Refund</SelectItem>
                    <SelectItem value="partial">Partial Refund</SelectItem>
                    <SelectItem value="none">No Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency-code">Currency Code</Label>
                <Input
                  id="currency-code"
                  value="Ghana Cedi (GHS)"
                  readOnly
                  disabled
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Payment Methods</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { value: 'card', label: 'Credit/Debit Card' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                    { value: 'ussd', label: 'USSD' },
                  ].map((method) => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`payment-method-${method.value}`}
                        checked={settings.bookingPayments.paymentMethods.includes(method.value)}
                        onCheckedChange={(checked) => {
                          const currentMethods = settings.bookingPayments.paymentMethods;
                          const newMethods = checked
                            ? [...currentMethods, method.value]
                            : currentMethods.filter((m) => m !== method.value);
                          setSettings({
                            ...settings,
                            bookingPayments: {
                              ...settings.bookingPayments,
                              paymentMethods: newMethods,
                            },
                          });
                        }}
                      />
                      <Label
                        htmlFor={`payment-method-${method.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chatCommunication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat & Communication Settings</CardTitle>
              <CardDescription>
                Configure chat moderation, content filtering, and communication policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="messaging-enabled"
                  checked={settings.chatCommunication.messagingEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        messagingEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="messaging-enabled">Enable Messaging Feature</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-auto-moderation"
                  checked={settings.chatCommunication.enableAutoModeration}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        enableAutoModeration: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="enable-auto-moderation">Enable Auto-Moderation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="profanity-filter"
                  checked={settings.chatCommunication.profanityFilterEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        profanityFilterEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="profanity-filter">Enable Profanity Filter</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-file-sharing"
                  checked={settings.chatCommunication.allowFileSharing}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        allowFileSharing: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="allow-file-sharing">Allow File Sharing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-voice-messages"
                  checked={settings.chatCommunication.allowVoiceMessages}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        allowVoiceMessages: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="allow-voice-messages">Allow Voice Messages</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-mute-offenders"
                  checked={settings.chatCommunication.autoMuteRepeatedOffenders}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        autoMuteRepeatedOffenders: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="auto-mute-offenders">Auto-mute Repeated Offenders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="moderator-notifications"
                  checked={settings.chatCommunication.moderatorNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        moderatorNotifications: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="moderator-notifications">Moderator Notifications</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="max-message-length">Maximum Message Length</Label>
                <Input
                  id="max-message-length"
                  type="number"
                  min="50"
                  max="5000"
                  value={settings.chatCommunication.maxMessageLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        maxMessageLength: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-history-retention">Chat History Retention (days)</Label>
                <Input
                  id="chat-history-retention"
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.chatCommunication.chatHistoryRetention}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        chatHistoryRetention: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagged-content-threshold">Flagged Content Threshold</Label>
                <Input
                  id="flagged-content-threshold"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.chatCommunication.flaggedContentThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatCommunication: {
                        ...settings.chatCommunication,
                        flaggedContentThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contentModeration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation Settings</CardTitle>
              <CardDescription>
                Configure automated content review, AI moderation, and reporting thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-content-review"
                  checked={settings.contentModeration.autoContentReview}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        autoContentReview: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="auto-content-review">Auto Content Review</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-moderation"
                  checked={settings.contentModeration.aiModerationEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        aiModerationEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="ai-moderation">AI Moderation Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="moderator-assignment-auto"
                  checked={settings.contentModeration.moderatorAssignmentAuto}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        moderatorAssignmentAuto: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="moderator-assignment-auto">Auto Moderator Assignment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="content-approval-required"
                  checked={settings.contentModeration.contentApprovalRequired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        contentApprovalRequired: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="content-approval-required">Content Approval Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="image-recognition"
                  checked={settings.contentModeration.imageRecognitionEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        imageRecognitionEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="image-recognition">Image Recognition Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="text-analysis"
                  checked={settings.contentModeration.textAnalysisEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        textAnalysisEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="text-analysis">Text Analysis Enabled</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="reporting-threshold">Reporting Threshold</Label>
                <Input
                  id="reporting-threshold"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.contentModeration.reportingThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        reportingThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-suspend-threshold">Auto-Suspend Threshold</Label>
                <Input
                  id="auto-suspend-threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.contentModeration.autoSuspendThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        autoSuspendThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-queue-limit">Review Queue Limit</Label>
                <Input
                  id="review-queue-limit"
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.contentModeration.reviewQueueLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contentModeration: {
                        ...settings.contentModeration,
                        reviewQueueLimit: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyticsReporting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reporting Settings</CardTitle>
              <CardDescription>
                Configure data retention, report generation, and analytics tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-user-analytics"
                  checked={settings.analyticsReporting.enableUserAnalytics}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        enableUserAnalytics: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="enable-user-analytics">Enable User Analytics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-performance-tracking"
                  checked={settings.analyticsReporting.enablePerformanceTracking}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        enablePerformanceTracking: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="enable-performance-tracking">Enable Performance Tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="generate-daily-reports"
                  checked={settings.analyticsReporting.generateDailyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        generateDailyReports: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="generate-daily-reports">Generate Daily Reports</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="generate-weekly-reports"
                  checked={settings.analyticsReporting.generateWeeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        generateWeeklyReports: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="generate-weekly-reports">Generate Weekly Reports</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="generate-monthly-reports"
                  checked={settings.analyticsReporting.generateMonthlyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        generateMonthlyReports: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="generate-monthly-reports">Generate Monthly Reports</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="export-data-enabled"
                  checked={settings.analyticsReporting.exportDataEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        exportDataEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="export-data-enabled">Enable Data Export</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymize-user-data"
                  checked={settings.analyticsReporting.anonymizeUserData}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        anonymizeUserData: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="anonymize-user-data">Anonymize User Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tracking-cookies"
                  checked={settings.analyticsReporting.trackingCookiesEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        trackingCookiesEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="tracking-cookies">Enable Tracking Cookies</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="data-retention-period">Data Retention Period (days)</Label>
                <Input
                  id="data-retention-period"
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.analyticsReporting.dataRetentionPeriod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      analyticsReporting: {
                        ...settings.analyticsReporting,
                        dataRetentionPeriod: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platformPolicies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Policies Settings</CardTitle>
              <CardDescription>
                Configure terms of service, privacy policies, and dispute resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="terms-version">Terms of Service Version</Label>
                <Input
                  id="terms-version"
                  value={settings.platformPolicies.termsOfServiceVersion}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        termsOfServiceVersion: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy-version">Privacy Policy Version</Label>
                <Input
                  id="privacy-version"
                  value={settings.platformPolicies.privacyPolicyVersion}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        privacyPolicyVersion: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancellation-policy">Cancellation Policy</Label>
                <Select
                  value={settings.platformPolicies.cancellationPolicy}
                  onValueChange={(value: 'flexible' | 'moderate' | 'strict') =>
                    setSettings({
                      ...settings,
                      platformPolicies: { ...settings.platformPolicies, cancellationPolicy: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cancellation policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="automatic-refund"
                  checked={settings.platformPolicies.automaticRefundEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        automaticRefundEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="automatic-refund">Enable Automatic Refunds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="service-guarantee"
                  checked={settings.platformPolicies.serviceGuaranteeEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        serviceGuaranteeEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="service-guarantee">Enable Service Guarantee</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="quality-assurance"
                  checked={settings.platformPolicies.qualityAssuranceEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        qualityAssuranceEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="quality-assurance">Enable Quality Assurance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="compliance-reporting"
                  checked={settings.platformPolicies.complianceReportingEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        complianceReportingEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="compliance-reporting">Enable Compliance Reporting</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="dispute-resolution-period">Dispute Resolution Period (days)</Label>
                <Input
                  id="dispute-resolution-period"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.platformPolicies.disputeResolutionPeriod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        disputeResolutionPeriod: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-dispute-period">Maximum Dispute Period (days)</Label>
                <Input
                  id="max-dispute-period"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.platformPolicies.maximumDisputePeriod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformPolicies: {
                        ...settings.platformPolicies,
                        maximumDisputePeriod: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systemMonitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring Settings</CardTitle>
              <CardDescription>
                Configure system monitoring, alerts, and backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="uptime-monitoring"
                  checked={settings.systemMonitoring.uptimeMonitoringEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        uptimeMonitoringEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="uptime-monitoring">Enable Uptime Monitoring</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="performance-alerts"
                  checked={settings.systemMonitoring.performanceAlertsEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        performanceAlertsEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="performance-alerts">Enable Performance Alerts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="database-monitoring"
                  checked={settings.systemMonitoring.databaseMonitoringEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        databaseMonitoringEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="database-monitoring">Enable Database Monitoring</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="security-scanning"
                  checked={settings.systemMonitoring.securityScanningEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        securityScanningEnabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="security-scanning">Enable Security Scanning</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select
                  value={settings.systemMonitoring.backupFrequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setSettings({
                      ...settings,
                      systemMonitoring: { ...settings.systemMonitoring, backupFrequency: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select backup frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-retention">Log Retention Period (days)</Label>
                <Input
                  id="log-retention"
                  type="number"
                  min="7"
                  max="365"
                  value={settings.systemMonitoring.logRetentionPeriod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        logRetentionPeriod: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="error-threshold">Error Threshold (%)</Label>
                <Input
                  id="error-threshold"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.systemMonitoring.errorThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        errorThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="response-time-threshold">Response Time Threshold (ms)</Label>
                <Input
                  id="response-time-threshold"
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.systemMonitoring.responseTimeThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        responseTimeThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disk-space-threshold">Disk Space Alert Threshold (%)</Label>
                <Input
                  id="disk-space-threshold"
                  type="number"
                  min="50"
                  max="95"
                  value={settings.systemMonitoring.diskSpaceAlertThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        diskSpaceAlertThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memory-threshold">Memory Usage Alert Threshold (%)</Label>
                <Input
                  id="memory-threshold"
                  type="number"
                  min="50"
                  max="95"
                  value={settings.systemMonitoring.memoryUsageAlertThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMonitoring: {
                        ...settings.systemMonitoring,
                        memoryUsageAlertThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
