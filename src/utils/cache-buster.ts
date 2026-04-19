/**
 * Cache Busting Utilities
 * Helps ensure browsers always load the latest version
 */

/**
 * Get current app version from package.json or generate timestamp
 */
export const getAppVersion = (): string => {
  // In production, this would come from package.json version
  // For now, use timestamp to ensure uniqueness
  return `v${Date.now()}`;
};

/**
 * Add version query parameter to URL for cache busting
 */
export const addVersionToUrl = (url: string): string => {
  const version = getAppVersion();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_v=${version}`;
};

/**
 * Force reload the page, bypassing cache
 */
export const forceReload = (): void => {
  // Clear service worker cache if exists
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }

  // Clear all caches
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  // Force reload from server
  window.location.reload();
};

/**
 * Compare live /version.json (emitted each build) with stored id. On mismatch, persist the new
 * id and reload so the shell picks up fresh chunk references — works even when HTML was cached.
 */
export const checkForUpdates = async (): Promise<boolean> => {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { version?: string };
    const remote = data.version != null ? String(data.version) : '';
    if (!remote) return false;

    const stored = localStorage.getItem('app_version');

    if (!stored) {
      localStorage.setItem('app_version', remote);
      return false;
    }

    if (stored !== remote) {
      localStorage.setItem('app_version', remote);
      window.location.reload();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

/**
 * Clear all browser caches
 */
export const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear localStorage (except auth)
    const authData = localStorage.getItem('supabase.auth.token');
    localStorage.clear();
    if (authData) {
      localStorage.setItem('supabase.auth.token', authData);
    }

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      databases.forEach((db) => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    }

    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    console.log('All caches cleared successfully');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
};

/**
 * Disable browser caching for development
 */
export const disableCaching = (): void => {
  if (import.meta.env.DEV) {
    // Intercept fetch requests to add no-cache headers
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const [resource, config] = args;
      const noCacheHeaders: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      };

      // If fetch is called with a Request object and no init config, we MUST preserve the Request headers.
      // Some SDKs (e.g. Supabase) rely on Request headers like `apikey`; overwriting them breaks auth.
      if (resource instanceof Request && !config) {
        const mergedHeaders = new Headers(resource.headers);
        Object.entries(noCacheHeaders).forEach(([k, v]) => mergedHeaders.set(k, v));
        const newRequest = new Request(resource, {
          cache: 'no-store',
          headers: mergedHeaders,
        });
        return originalFetch(newRequest);
      }

      const mergedHeaders = new Headers((config as any)?.headers || {});
      Object.entries(noCacheHeaders).forEach(([k, v]) => mergedHeaders.set(k, v));

      const newConfig: RequestInit = {
        ...(config || {}),
        cache: 'no-store',
        headers: mergedHeaders,
      };

      return originalFetch(resource as any, newConfig);
    };
  }
};

/**
 * Initialize cache busting on app load
 */
const DEPLOY_POLL_MS = 45 * 1000;

export const initCacheBusting = (): void => {
  // Disable caching in development
  disableCaching();

  if (import.meta.env.PROD) {
    const poll = () => {
      void checkForUpdates();
    };

    poll();
    setInterval(poll, DEPLOY_POLL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        poll();
      }
    });
  }

  // Add keyboard shortcut for force reload (Ctrl+Shift+R or Cmd+Shift+R)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      forceReload();
    }
  });
};
