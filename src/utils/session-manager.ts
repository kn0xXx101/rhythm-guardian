import { supabase } from '@/lib/supabase';

/**
 * Session Manager Utility
 * Handles session validation, refresh, and error recovery
 */

export class SessionManager {
  private static refreshPromise: Promise<boolean> | null = null;
  private static lastRefreshAttempt: number = 0;
  private static readonly REFRESH_COOLDOWN = 5000; // 5 seconds between refresh attempts
  private static readonly FORCE_REFRESH_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Check if there's an active session
   */
  static async hasActiveSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        return false;
      }
      
      if (!session) {
        return false;
      }

      // Check if session is expired
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (now >= expiresAt) {
          console.log('Session has expired');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }

  /**
   * Refresh the current session
   */
  static async refreshSession(options?: { force?: boolean }): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Prevent refresh attempts too close together
    const now = Date.now();
    const force = options?.force === true;
    if (!force && now - this.lastRefreshAttempt < this.REFRESH_COOLDOWN) {
      // If we have an active (non-expired) session, treat this as "good enough"
      // to avoid cascading failures during bursts of requests.
      const stillValid = await this.hasActiveSession();
      if (stillValid) return true;
      console.log('Refresh cooldown active, skipping refresh');
      return false;
    }

    this.lastRefreshAttempt = now;

    this.refreshPromise = (async () => {
      try {
        console.log('Attempting to refresh session...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Session refresh failed:', error);
          return false;
        }

        if (!data.session) {
          console.error('Session refresh returned no session');
          return false;
        }

        console.log('Session refreshed successfully');
        return true;
      } catch (error) {
        console.error('Session refresh error:', error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get current session or attempt to refresh if expired
   */
  static async getValidSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        return null;
      }

      if (!session) {
        console.log('No active session found');
        return null;
      }

      // Check if session is expired or about to expire
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresInMs = expiresAt * 1000 - Date.now();
        const tenMinutes = 10 * 60 * 1000;
        const forceRefresh = expiresInMs > 0 && expiresInMs < this.FORCE_REFRESH_WINDOW_MS;

        // If expired, return null
        if (expiresInMs <= 0) {
          console.log('Session has expired');
          return null;
        }

        // If expiring within 10 minutes, try to refresh
        if (expiresInMs < tenMinutes) {
          console.log(`Session expiring in ${Math.round(expiresInMs / 1000 / 60)} minutes, refreshing...`);
          const refreshed = await this.refreshSession({ force: forceRefresh });
          
          if (refreshed) {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            return newSession;
          } else {
            // Refresh failed, but session might still be valid for a bit
            if (expiresInMs > 0) {
              console.log('Refresh failed but session still valid, returning current session');
              return session;
            }
            return null;
          }
        }
      }

      return session;
    } catch (error) {
      console.error('Error getting valid session:', error);
      return null;
    }
  }

  /**
   * Handle session errors and provide user-friendly messages
   */
  static handleSessionError(error: any): {
    shouldRedirectToLogin: boolean;
    message: string;
    title: string;
  } {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;

    // Session expired or invalid
    if (
      errorMessage.includes('no active session') ||
      errorMessage.includes('session expired') ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('jwt expired') ||
      errorMessage.includes('refresh_token_not_found') ||
      errorCode === 401
    ) {
      return {
        shouldRedirectToLogin: true,
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again to continue.',
      };
    }

    // Network or connection errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')
    ) {
      return {
        shouldRedirectToLogin: false,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
      };
    }

    // Generic authentication error
    return {
      shouldRedirectToLogin: true,
      title: 'Authentication Error',
      message: 'There was a problem with your authentication. Please log in again.',
    };
  }

  /**
   * Sign out and clear session
   */
  static async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Initialize session monitoring
   * Call this once when the app starts
   */
  static initializeSessionMonitoring(): () => void {
    let intervalId: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkAndRefreshSession();
      }
    };

    const handleOnline = () => {
      void checkAndRefreshSession();
    };

    const checkAndRefreshSession = async () => {
      const session = await this.getValidSession();
      if (!session) {
        console.log('Session monitoring: No valid session found');
      }
    };

    // Check session every 5 minutes
    intervalId = window.setInterval(checkAndRefreshSession, 5 * 60 * 1000);

    // Initial check
    checkAndRefreshSession();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // Return cleanup function
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }
}
