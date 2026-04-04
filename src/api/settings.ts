import { Settings } from '@/types/settings';
import { supabase } from '@/lib/supabase';

// Default settings fallback
const defaultSettings: Settings = {
  general: {
    siteName: 'Rhythm Guardian',
    siteDescription: 'Connect with talented musicians and find the perfect sound for your event.',
    adminEmail: 'admin@rhythmguardian.com',
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
    notificationEmail: 'notifications@rhythmguardian.com',
  },
  appearance: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    darkMode: false,
    fontFamily: 'inter',
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

// Sync key settings to platform_settings for edge functions (paystack, auto-payouts)
const syncToPlatformSettings = async (s: Settings) => {
  try {
    await (supabase as any)
      .from('platform_settings')
      .upsert(
        [
          { key: 'booking', value: s.bookingPayments },
          { key: 'chat', value: s.chatCommunication },
        ],
        { onConflict: 'key' }
      );
  } catch (e) {
    console.warn('Could not sync to platform_settings:', e);
  }
};

// Helper function to merge settings from database with defaults
const mergeSettings = (dbSettings: Partial<Settings>): Settings => {
  return {
    general: { ...defaultSettings.general, ...dbSettings.general },
    security: { ...defaultSettings.security, ...dbSettings.security },
    notifications: { ...defaultSettings.notifications, ...dbSettings.notifications },
    appearance: { ...defaultSettings.appearance, ...dbSettings.appearance },
    integrations: { ...defaultSettings.integrations, ...dbSettings.integrations },
    userManagement: { ...defaultSettings.userManagement, ...dbSettings.userManagement },
    bookingPayments: { ...defaultSettings.bookingPayments, ...dbSettings.bookingPayments },
    chatCommunication: { ...defaultSettings.chatCommunication, ...dbSettings.chatCommunication },
    contentModeration: { ...defaultSettings.contentModeration, ...dbSettings.contentModeration },
    analyticsReporting: { ...defaultSettings.analyticsReporting, ...dbSettings.analyticsReporting },
    platformPolicies: { ...defaultSettings.platformPolicies, ...dbSettings.platformPolicies },
    systemMonitoring: { ...defaultSettings.systemMonitoring, ...dbSettings.systemMonitoring },
  };
};

const buildSettingsFromPlatformRows = (
  rows: Array<{ key: string; value: Record<string, unknown> }>
): Settings => {
  const mapped: Partial<Settings> = {};

  for (const row of rows) {
    if (!row?.key || !row?.value) continue;

    if (row.key === 'general') {
      mapped.general = row.value as Settings['general'];
    } else if (row.key === 'security') {
      mapped.security = row.value as Settings['security'];
    } else if (row.key === 'notifications') {
      mapped.notifications = row.value as Settings['notifications'];
    } else if (row.key === 'booking') {
      mapped.bookingPayments = row.value as Settings['bookingPayments'];
    } else if (row.key === 'user_management') {
      mapped.userManagement = row.value as Settings['userManagement'];
    } else if (row.key === 'chat') {
      mapped.chatCommunication = row.value as Settings['chatCommunication'];
    } else if (row.key === 'appearance') {
      mapped.appearance = row.value as Settings['appearance'];
    } else if (row.key === 'integrations') {
      mapped.integrations = row.value as Settings['integrations'];
    } else if (row.key === 'content_moderation') {
      mapped.contentModeration = row.value as Settings['contentModeration'];
    } else if (row.key === 'analytics_reporting') {
      mapped.analyticsReporting = row.value as Settings['analyticsReporting'];
    } else if (row.key === 'platform_policies') {
      mapped.platformPolicies = row.value as Settings['platformPolicies'];
    } else if (row.key === 'system_monitoring') {
      mapped.systemMonitoring = row.value as Settings['systemMonitoring'];
    }
  }

  return mergeSettings(mapped);
};

const getSettingsFromSettingsTable = async () => {
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('value')
    .eq('key', 'platform_settings')
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
};

const getSettingsFromPlatformTable = async () => {
  const { data, error } = await (supabase as any)
    .from('platform_settings')
    .select('key, value');

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
};

export const getSettings = async (): Promise<Settings> => {
  try {
    console.log('Fetching settings from database...');

    const settingsTableResult = await getSettingsFromSettingsTable();
    if (!settingsTableResult.error && settingsTableResult.data?.value) {
      const mergedSettings = mergeSettings(
        settingsTableResult.data.value as Partial<Settings>
      );
      return mergedSettings;
    }

    const platformTableResult = await getSettingsFromPlatformTable();
    if (!platformTableResult.error && Array.isArray(platformTableResult.data)) {
      return buildSettingsFromPlatformRows(platformTableResult.data as Array<{
        key: string;
        value: Record<string, unknown>;
      }>);
    }

    if (settingsTableResult.error) {
      console.error('Error fetching settings:', settingsTableResult.error);
    }
    if (platformTableResult.error) {
      console.error('Error fetching platform settings:', platformTableResult.error);
    }

    return defaultSettings;
  } catch (error) {
    const isConnectionError = 
      error instanceof TypeError && 
      (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));
    
    if (!isConnectionError) {
      console.error('Failed to load settings from database:', error);
    }
    
    return defaultSettings;
  }
};

export const updateSettings = async (newSettings: Settings): Promise<Settings> => {
  try {
    console.log('Updating settings with the following data:', newSettings);

    const upsertResult = await (supabase as any)
      .from('settings')
      .upsert(
        {
          key: 'platform_settings',
          value: newSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .single();

    if (!upsertResult.error && upsertResult.data?.value) {
      // Sync to platform_settings for edge functions (paystack, auto-payouts) that read from there
      await syncToPlatformSettings(newSettings);
      return upsertResult.data.value as Settings;
    }

    const platformPayload = [
      { key: 'general', value: newSettings.general },
      { key: 'security', value: newSettings.security },
      { key: 'notifications', value: newSettings.notifications },
      { key: 'appearance', value: newSettings.appearance },
      { key: 'integrations', value: newSettings.integrations },
      { key: 'user_management', value: newSettings.userManagement },
      { key: 'booking', value: newSettings.bookingPayments },
      { key: 'chat', value: newSettings.chatCommunication },
      { key: 'content_moderation', value: newSettings.contentModeration },
      { key: 'analytics_reporting', value: newSettings.analyticsReporting },
      { key: 'platform_policies', value: newSettings.platformPolicies },
      { key: 'system_monitoring', value: newSettings.systemMonitoring },
    ];

    const { error: platformError } = await (supabase as any)
      .from('platform_settings')
      .upsert(platformPayload, { onConflict: 'key' });

    if (platformError) {
      console.error('Error updating settings in Supabase:', platformError);
      throw new Error(`Failed to update settings: ${platformError.message}`);
    }

    // syncToPlatformSettings already done via platformPayload above
    return newSettings;
  } catch (error) {
    console.error('An unexpected error occurred while saving settings:', error);
    throw error;
  }
};

// Helper functions to get specific settings sections
export const getSecuritySettings = async () => {
  const settings = await getSettings();
  return settings.security;
};

export const getUserManagementSettings = async () => {
  const settings = await getSettings();
  return settings.userManagement;
};

export const getGeneralSettings = async () => {
  const settings = await getSettings();
  return settings.general;
};
