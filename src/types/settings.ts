export interface Settings {
  general: {
    siteName: string;
    siteDescription: string;
    adminEmail: string;
    timezone: string;
    maintenanceMode: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    emailVerificationRequired: boolean;
    sessionTimeout: number;
    passwordPolicy: 'low' | 'medium' | 'high';
  };
  notifications: {
    emailNotifications: boolean;
    adminAlerts: boolean;
    systemUpdates: boolean;
    notificationEmail: string;
  };
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    darkMode: boolean;
    fontFamily: string;
  };
  integrations: {
    paystackPublicKey: string;
    googleAnalyticsId: string;
    smtpServer: string;
    enableAnalytics: boolean;
  };
  userManagement: {
    autoApproveHirers: boolean;
    requireMusicianVerification: boolean;
    allowSelfRegistration: boolean;
    maxProfileImages: number;
    requirePhoneVerification: boolean;
    minimumAge: number;
    profileCompletionRequired: boolean;
    backgroundCheckRequired: boolean;
  };
  bookingPayments: {
    platformCommissionRate: number;
    minimumBookingAmount: number;
    maximumBookingAmount: number;
    allowInstantBooking: boolean;
    requireDepositPayment: boolean;
    depositPercentage: number;
    cancellationWindow: number;
    refundPolicy: 'full' | 'partial' | 'none';
    paymentMethods: string[];
    currencyCode: string;
  };
  chatCommunication: {
    messagingEnabled: boolean;
    enableAutoModeration: boolean;
    profanityFilterEnabled: boolean;
    maxMessageLength: number;
    allowFileSharing: boolean;
    allowVoiceMessages: boolean;
    chatHistoryRetention: number;
    flaggedContentThreshold: number;
    autoMuteRepeatedOffenders: boolean;
    moderatorNotifications: boolean;
  };
  contentModeration: {
    autoContentReview: boolean;
    aiModerationEnabled: boolean;
    reportingThreshold: number;
    autoSuspendThreshold: number;
    reviewQueueLimit: number;
    moderatorAssignmentAuto: boolean;
    contentApprovalRequired: boolean;
    imageRecognitionEnabled: boolean;
    textAnalysisEnabled: boolean;
  };
  analyticsReporting: {
    dataRetentionPeriod: number;
    enableUserAnalytics: boolean;
    enablePerformanceTracking: boolean;
    generateDailyReports: boolean;
    generateWeeklyReports: boolean;
    generateMonthlyReports: boolean;
    exportDataEnabled: boolean;
    anonymizeUserData: boolean;
    trackingCookiesEnabled: boolean;
  };
  platformPolicies: {
    termsOfServiceVersion: string;
    privacyPolicyVersion: string;
    cancellationPolicy: 'flexible' | 'moderate' | 'strict';
    disputeResolutionPeriod: number;
    maximumDisputePeriod: number;
    automaticRefundEnabled: boolean;
    serviceGuaranteeEnabled: boolean;
    qualityAssuranceEnabled: boolean;
    complianceReportingEnabled: boolean;
  };
  systemMonitoring: {
    uptimeMonitoringEnabled: boolean;
    performanceAlertsEnabled: boolean;
    errorThreshold: number;
    responseTimeThreshold: number;
    diskSpaceAlertThreshold: number;
    memoryUsageAlertThreshold: number;
    databaseMonitoringEnabled: boolean;
    securityScanningEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    logRetentionPeriod: number;
  };
}
