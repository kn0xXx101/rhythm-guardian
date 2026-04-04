import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import MusicianDashboard from '@/pages/MusicianDashboard';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/api/settings';
import type { Settings } from '@/types/settings';

// Create a mock function that returns a chainable object
const createChainableMock = () => {
  const mock = vi.fn();
  mock.mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    execute: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  });
  return mock;
};

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: createChainableMock(),
    removeSubscription: vi.fn(),
  },
}));

// Mock getSettings
vi.mock('@/api/settings');

const defaultSettings: Settings = {
  general: {
    siteName: 'Test Site',
    siteDescription: 'Test Description',
    adminEmail: 'admin@test.com',
    timezone: 'UTC',
    maintenanceMode: false,
  },
  security: {
    twoFactorEnabled: false,
    emailVerificationRequired: true,
    sessionTimeout: 3600,
    passwordPolicy: 'medium',
  },
  notifications: {
    emailNotifications: true,
    adminAlerts: true,
    systemUpdates: true,
    notificationEmail: 'notify@test.com',
  },
  appearance: {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    darkMode: false,
    fontFamily: 'Arial',
  },
  integrations: {
    stripeKey: 'test_key',
    googleAnalyticsId: '',
    smtpServer: 'smtp.test.com',
    enableAnalytics: false,
  },
  userManagement: {
    autoApproveHirers: false,
    requireMusicianVerification: true,
    allowSelfRegistration: true,
    maxProfileImages: 5,
    requirePhoneVerification: true,
    minimumAge: 18,
    profileCompletionRequired: true,
    backgroundCheckRequired: true,
  },
  bookingPayments: {
    platformCommissionRate: 5,
    minimumBookingAmount: 100,
    maximumBookingAmount: 10000,
    allowInstantBooking: true,
    requireDepositPayment: false,
    depositPercentage: 0,
    cancellationWindow: 24,
    refundPolicy: 'full',
    paymentMethods: ['card'],
    currencyCode: 'GHS',
  },
  chatCommunication: {
    enableAutoModeration: true,
    profanityFilterEnabled: true,
    maxMessageLength: 1000,
    allowFileSharing: true,
    allowVoiceMessages: false,
    chatHistoryRetention: 30,
    flaggedContentThreshold: 3,
    autoMuteRepeatedOffenders: true,
    moderatorNotifications: true,
  },
  contentModeration: {
    autoContentReview: true,
    aiModerationEnabled: false,
    reportingThreshold: 3,
    autoSuspendThreshold: 5,
    reviewQueueLimit: 100,
    moderatorAssignmentAuto: true,
    contentApprovalRequired: true,
    imageRecognitionEnabled: false,
    textAnalysisEnabled: true,
  },
  analyticsReporting: {
    dataRetentionPeriod: 90,
    enableUserAnalytics: true,
    enablePerformanceTracking: true,
    generateDailyReports: false,
    generateWeeklyReports: true,
    generateMonthlyReports: true,
    exportDataEnabled: true,
    anonymizeUserData: true,
    trackingCookiesEnabled: false,
  },
  platformPolicies: {
    termsOfServiceVersion: '1.0',
    privacyPolicyVersion: '1.0',
    cancellationPolicy: 'moderate',
    disputeResolutionPeriod: 7,
    maximumDisputePeriod: 30,
    automaticRefundEnabled: true,
    serviceGuaranteeEnabled: true,
    qualityAssuranceEnabled: true,
    complianceReportingEnabled: true,
  },
  systemMonitoring: {
    uptimeMonitoringEnabled: true,
    performanceAlertsEnabled: true,
    errorThreshold: 5,
    responseTimeThreshold: 1000,
    diskSpaceAlertThreshold: 90,
    memoryUsageAlertThreshold: 80,
    databaseMonitoringEnabled: true,
    securityScanningEnabled: true,
    backupFrequency: 'daily',
    logRetentionPeriod: 30,
  },
};

describe('MusicianDashboard Integration', () => {
  const mockProfile = {
    user_id: 'test-id',
    full_name: 'Test Musician',
    email: 'musician@test.com',
    phone: '+233123456789',
    location: 'Accra, Ghana',
    bio: 'Professional guitarist with 10 years experience',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'musician',
    status: 'active',
    profile_completion_percentage: 60,
    documents_submitted: false,
    documents_verified: false,
    genres: ['Jazz', 'Blues'],
    instruments: ['Guitar', 'Piano'],
    hourly_rate: 100,
    availability: ['weekends', 'evenings'],
    required_documents: [
      {
        type: 'id',
        required: true,
        verified: false,
      },
      {
        type: 'certification',
        required: true,
        verified: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock profile fetch
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    // Reset getSettings mock to default
    vi.mocked(getSettings).mockResolvedValue(defaultSettings);
  });

  it('should populate personal information from database', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check if profile data is displayed
      expect(screen.getByText(mockProfile.full_name)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.email)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.phone)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.location)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.bio)).toBeInTheDocument();

      // Check if professional details are displayed
      mockProfile.genres.forEach((genre) => {
        expect(screen.getByText(genre)).toBeInTheDocument();
      });
      mockProfile.instruments.forEach((instrument) => {
        expect(screen.getByText(instrument)).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          `${defaultSettings.bookingPayments.currencyCode} ${mockProfile.hourly_rate}/hr`
        )
      ).toBeInTheDocument();

      // Check if availability is displayed
      mockProfile.availability.forEach((slot) => {
        expect(screen.getByText(slot, { exact: false })).toBeInTheDocument();
      });
    });
  });

  it('should pass profile data when navigating to profile page', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const editProfileButton = screen.getByText('Edit Profile');
      expect(editProfileButton).toBeInTheDocument();

      // Get the Link component wrapping the button
      const linkElement = editProfileButton.closest('a');
      expect(linkElement).toHaveAttribute('href', '/musician/profile');

      // Verify that the state prop contains the profile data
      const state = JSON.parse(linkElement?.getAttribute('state') || '{}');
      expect(state.profileData).toEqual(
        expect.objectContaining({
          full_name: mockProfile.full_name,
          email: mockProfile.email,
          phone: mockProfile.phone,
          location: mockProfile.location,
          bio: mockProfile.bio,
          avatar_url: mockProfile.avatar_url,
        })
      );
    });
  });

  it('should display profile completion percentage', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    });
  });

  it('should display document verification status', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Please submit your required documents/)).toBeInTheDocument();
    });

    // Update mock for submitted documents
    const submittedProfile = {
      ...mockProfile,
      documents_submitted: true,
    };
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: submittedProfile,
      error: null,
    });

    // Simulate profile update
    await waitFor(() => {
      expect(screen.getByText(/Your profile is pending verification/)).toBeInTheDocument();
    });
  });

  it('should handle document submission', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    // Mock successful document submission
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().update.mockResolvedValue({ error: null });

    await waitFor(() => {
      expect(screen.getByText(/Complete Verification/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Complete Verification/));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockFrom().update).toHaveBeenCalledWith(
        expect.objectContaining({
          documents_submitted: true,
        })
      );
    });
  });

  it('should handle profile completion updates', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    // Mock profile with all fields completed
    const completedProfile = {
      ...mockProfile,
      profile_completion_percentage: 100,
      profile_complete: true,
    };
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: completedProfile,
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('should handle error states', async () => {
    // Mock error response
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: null,
      error: new Error('Failed to load profile'),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading profile/)).toBeInTheDocument();
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });

    // Test retry functionality
    mockFrom().single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    fireEvent.click(screen.getByText(/Retry/));

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('should update UI when documents are verified', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    // Update mock for verified documents
    const verifiedProfile = {
      ...mockProfile,
      documents_submitted: true,
      documents_verified: true,
      required_documents: mockProfile.required_documents.map((doc) => ({
        ...doc,
        verified: true,
      })),
    };
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: verifiedProfile,
      error: null,
    });

    await waitFor(
      () => {
        expect(screen.getByText(/Your profile has been verified!/)).toBeInTheDocument();
        mockProfile.required_documents.forEach((doc) => {
          expect(screen.getByText(/Verified/)).toBeInTheDocument();
        });
      },
      { timeout: 1000 }
    );
  });

  it('should display and calculate with dynamic admin fee percentage', async () => {
    // Mock getSettings to return custom commission rate
    vi.mocked(getSettings).mockResolvedValue({
      ...defaultSettings,
      bookingPayments: {
        ...defaultSettings.bookingPayments,
        platformCommissionRate: 15, // 15%
      },
    });

    // Mock booking data with completed payments
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({
          data: [
            { status: 'completed', payment_status: 'paid', total_amount: 1000 },
            { status: 'completed', payment_status: 'paid', total_amount: 2000 },
          ],
          error: null,
        }),
      }),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <MusicianDashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check if 15% is displayed in the UI
      expect(screen.getByText(/minus a 15% admin fee/)).toBeInTheDocument();
      expect(screen.getByText(/Released Earnings \(after 15% admin fee\)/)).toBeInTheDocument();
    });
  });
});
