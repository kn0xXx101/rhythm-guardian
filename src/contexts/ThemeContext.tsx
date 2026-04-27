import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { Settings } from '@/types/settings';
import { getSettings } from '@/api/settings';

interface ThemeContextType {
  settings: Settings | null;
  applyTheme: (settings: Settings) => void;
  isLoading: boolean;
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Default settings to prevent blank screen
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
    platformCommissionRate: 10,
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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [appliedSettings, setAppliedSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  const localStorageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const themeRef = useRef<'light' | 'dark' | 'system'>('system');

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      setIsLoading(true);
      try {
        // Load saved theme preference
        let savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        const themeMigrationKey = 'rg:theme-migration:admin-dark-default-fix:v1';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Use cached settings for fastest first paint.
        const savedSettings = localStorage.getItem('theme-settings');
        const cachedSettings = savedSettings
          ? (JSON.parse(savedSettings) as Settings)
          : defaultSettings;

        // 1) Apply cached settings immediately (instant UI).
        // 2) Fetch authoritative settings in the background and apply if different.
        let settings: Settings = cachedSettings;

        // One-time migration: older admin layout forced `theme=dark` in localStorage.
        // If platform default dark mode is now off, restore true default behavior.
        const migrated = localStorage.getItem(themeMigrationKey) === 'true';
        if (!migrated && savedTheme === 'dark' && settings.appearance.darkMode === false) {
          localStorage.removeItem('theme');
          savedTheme = null;
        }
        if (!migrated) {
          localStorage.setItem(themeMigrationKey, 'true');
        }

        // Determine initial theme
        // Priority: saved theme > settings darkMode > light
        let initialTheme: 'light' | 'dark' | 'system';
        if (savedTheme) {
          initialTheme = savedTheme;
        } else if (settings.appearance.darkMode) {
          initialTheme = 'dark';
        } else {
          initialTheme = 'light';
        }
        setTheme(initialTheme);

        // Resolve the actual theme (light or dark)
        const actualTheme =
          initialTheme === 'system' ? (prefersDark ? 'dark' : 'light') : initialTheme;
        setResolvedTheme(actualTheme);

        // Apply theme and settings
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(actualTheme);

        applyTheme(settings);

        // Background refresh from DB (non-blocking).
        // This is what makes appearance consistent across devices without slowing down startup.
        void (async () => {
          try {
            const dbSettings = await getSettings();
            const cachedString = JSON.stringify(cachedSettings);
            const dbString = JSON.stringify(dbSettings);
            if (dbString !== cachedString) {
              applyTheme(dbSettings);
            }
          } catch (e) {
            // Ignore — cached/default settings already applied.
          }
        })();
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to defaults
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add('light');
        setResolvedTheme('light');
        applyTheme(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();

    // Listen for system theme changes
    mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Use ref to get current theme value to avoid stale closure
      if (themeRef.current === 'system') {
        requestAnimationFrame(() => {
          const root = window.document.documentElement;
          const newTheme = e.matches ? 'dark' : 'light';
          root.classList.remove('light', 'dark');
          root.classList.add(newTheme);
          setResolvedTheme(newTheme);
        });
      }
    };

    mediaQueryRef.current.addEventListener('change', handleChange);
    return () => {
      if (mediaQueryRef.current) {
        mediaQueryRef.current.removeEventListener('change', handleChange);
      }
    };
  }, []); // Only run on mount

  // Update theme ref whenever theme changes
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Handle theme changes - optimized for performance
  useEffect(() => {
    if (!isLoading && appliedSettings) {
      // Batch DOM updates using requestAnimationFrame for smooth transitions
      requestAnimationFrame(() => {
        const root = window.document.documentElement;
        const prefersDark =
          mediaQueryRef.current?.matches ??
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
        const newResolvedTheme = isDark ? 'dark' : 'light';

        // Batch DOM operations
        root.classList.remove('light', 'dark');
        root.classList.add(newResolvedTheme);
        setResolvedTheme(newResolvedTheme);
        
        // Reapply theme colors to ensure they work in both light and dark modes
        applyTheme(appliedSettings);
      });

      // Defer localStorage write to avoid blocking UI
      if (localStorageTimeoutRef.current) {
        clearTimeout(localStorageTimeoutRef.current);
      }
      localStorageTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('theme', theme);
      }, 0);
    }
  }, [theme, isLoading, appliedSettings]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const applyTheme = useCallback((themeSettings: Settings) => {
    try {
      const root = document.documentElement;

      // Apply font family globally
      if (themeSettings.appearance?.fontFamily) {
        const fontMap: Record<string, string> = {
          'inter': 'Inter, sans-serif',
          'roboto': 'Roboto, sans-serif',
          'open-sans': 'Open Sans, sans-serif',
          'poppins': 'Poppins, sans-serif',
          'righteous': 'Righteous, sans-serif',
          'fredoka': 'Fredoka, sans-serif',
          'baloo-tamma': '"Baloo Tamma 2", sans-serif',
        };
        
        const selectedFont = fontMap[themeSettings.appearance.fontFamily] || 'Inter, sans-serif';
        // Prefer CSS variables so the change affects headings + all Tailwind typography consistently.
        root.style.setProperty('--font-sans', selectedFont);
        root.style.setProperty('--font-display', selectedFont);
        // Back-compat for any legacy code still reading --font-family.
        root.style.setProperty('--font-family', selectedFont);
        // Keep body style in sync for any elements outside Tailwind/base.
        document.body.style.fontFamily = selectedFont;
        console.log('Applied font:', selectedFont);
      }

      // Apply colors using CSS custom properties with !important to override defaults
      // These will override both :root and .dark definitions
      if (themeSettings.appearance.primaryColor) {
        const primaryHsl = hexToHsl(themeSettings.appearance.primaryColor);
        const primaryHslString = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`;
        const primaryForeground = primaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%';
        
        console.log('Applying primary color:', primaryHslString, 'to both light and dark modes');
        
        // Set primary color for both light and dark modes with !important
        root.style.setProperty('--primary', primaryHslString, 'important');
        root.style.setProperty('--primary-foreground', primaryForeground, 'important');
        root.style.setProperty('--sidebar-primary', primaryHslString, 'important');
        root.style.setProperty('--sidebar-primary-foreground', primaryForeground, 'important');
        root.style.setProperty('--ring', primaryHslString, 'important');
        
        // Create hover variants that work in both themes
        const primaryHover = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l > 50 ? Math.max(primaryHsl.l - 10, 0) : Math.min(primaryHsl.l + 10, 100)}%`;
        root.style.setProperty('--primary-hover', primaryHover, 'important');
      }

      if (themeSettings.appearance.secondaryColor) {
        const secondaryHsl = hexToHsl(themeSettings.appearance.secondaryColor);
        const secondaryHslString = `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`;
        const secondaryForeground = secondaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%';
        
        console.log('Applying secondary color:', secondaryHslString, 'to both light and dark modes');
        
        // Set secondary color for both light and dark modes with !important
        root.style.setProperty('--secondary', secondaryHslString, 'important');
        root.style.setProperty('--secondary-foreground', secondaryForeground, 'important');
        root.style.setProperty('--accent', secondaryHslString, 'important');
        root.style.setProperty('--accent-foreground', secondaryForeground, 'important');
        
        // Create hover variants that work in both themes
        const secondaryHover = `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l > 50 ? Math.max(secondaryHsl.l - 10, 0) : Math.min(secondaryHsl.l + 10, 100)}%`;
        root.style.setProperty('--secondary-hover', secondaryHover, 'important');
        root.style.setProperty('--accent-hover', secondaryHover, 'important');
      }

      // Also inject CSS to ensure it works in both light and dark modes
      let styleElement = document.getElementById('kiro-theme-override');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'kiro-theme-override';
        document.head.appendChild(styleElement);
      }

      const primaryHsl = themeSettings.appearance.primaryColor ? hexToHsl(themeSettings.appearance.primaryColor) : null;
      const secondaryHsl = themeSettings.appearance.secondaryColor ? hexToHsl(themeSettings.appearance.secondaryColor) : null;

      let cssRules = '';
      
      if (primaryHsl) {
        const primaryHslString = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`;
        const primaryForeground = primaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%';
        const primaryHover = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l > 50 ? Math.max(primaryHsl.l - 10, 0) : Math.min(primaryHsl.l + 10, 100)}%`;
        
        cssRules += `
          :root, .dark {
            --primary: ${primaryHslString} !important;
            --primary-foreground: ${primaryForeground} !important;
            --sidebar-primary: ${primaryHslString} !important;
            --sidebar-primary-foreground: ${primaryForeground} !important;
            --ring: ${primaryHslString} !important;
            --primary-hover: ${primaryHover} !important;
          }
        `;
      }

      if (secondaryHsl) {
        const secondaryHslString = `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`;
        const secondaryForeground = secondaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%';
        const secondaryHover = `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l > 50 ? Math.max(secondaryHsl.l - 10, 0) : Math.min(secondaryHsl.l + 10, 100)}%`;
        
        cssRules += `
          :root, .dark {
            --secondary: ${secondaryHslString} !important;
            --secondary-foreground: ${secondaryForeground} !important;
            --accent: ${secondaryHslString} !important;
            --accent-foreground: ${secondaryForeground} !important;
            --secondary-hover: ${secondaryHover} !important;
            --accent-hover: ${secondaryHover} !important;
          }
        `;
      }

      styleElement.textContent = cssRules;

      // Apply font family
      if (themeSettings.appearance.fontFamily) {
        const fontFamily = getFontFamily(themeSettings.appearance.fontFamily);
        root.style.setProperty('--font-family', fontFamily);
        if (document.body) {
          document.body.style.fontFamily = fontFamily;
        }
      }

      // Apply default dark mode if user has no saved theme preference.
      // When darkMode is OFF, default must be light (not system-driven dark).
      // User's manual theme selection (via toggleTheme) should always take precedence
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      if (!savedTheme) {
        // No saved preference - apply platform default exactly as configured.
        const newTheme: 'light' | 'dark' = themeSettings.appearance.darkMode ? 'dark' : 'light';

        // Update theme state and apply to DOM
        setTheme(newTheme);
        setResolvedTheme(newTheme);
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
      }

      // Defer localStorage write to avoid blocking UI
      if (localStorageTimeoutRef.current) {
        clearTimeout(localStorageTimeoutRef.current);
      }
      localStorageTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('theme-settings', JSON.stringify(themeSettings));
      }, 0);

      setAppliedSettings(themeSettings);
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: ThemeContextType = useMemo(
    () => ({
      settings: appliedSettings,
      applyTheme,
      isLoading,
      theme,
      resolvedTheme,
      toggleTheme,
    }),
    [appliedSettings, applyTheme, isLoading, theme, resolvedTheme, toggleTheme]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (localStorageTimeoutRef.current) {
        clearTimeout(localStorageTimeoutRef.current);
      }
    };
  }, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Helper function to convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  try {
    // Remove the hash if present
    hex = hex.replace('#', '');

    // Parse the hex values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  } catch (error) {
    console.error('Error converting hex to HSL:', error);
    return { h: 0, s: 0, l: 50 };
  }
}

// Helper function to get font family CSS value
function getFontFamily(fontFamily: string): string {
  switch (fontFamily) {
    case 'inter':
      return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'roboto':
      return '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'open-sans':
      return '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'poppins':
      return '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'righteous':
      return '"Righteous", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'fredoka':
      return '"Fredoka", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'baloo-tamma':
      return '"Baloo Tamma 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    default:
      return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
}

