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
 * Check if new version is available
 */
export const checkForUpdates = async (): Promise<boolean> => {
  try {
    const response = await fetch('/version.json?' + Date.now(), {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      const currentVersion = localStorage.getItem('app_version');
      
      if (currentVersion && currentVersion !== data.version) {
        return true; // New version available
      }
      
      localStorage.setItem('app_version', data.version);
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
  
  return false;
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
      const newConfig = {
        ...config,
        cache: 'no-store' as RequestCache,
        headers: {
          ...config?.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      };
      return originalFetch(resource, newConfig);
    };
  }
};

/**
 * Initialize cache busting on app load
 */
export const initCacheBusting = (): void => {
  // Disable caching in development
  disableCaching();

  // Check for updates periodically (every 5 minutes)
  if (import.meta.env.PROD) {
    setInterval(async () => {
      const hasUpdate = await checkForUpdates();
      if (hasUpdate) {
        // Notify user about update
        const shouldUpdate = confirm(
          'A new version is available. Would you like to reload to get the latest updates?'
        );
        if (shouldUpdate) {
          forceReload();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Add keyboard shortcut for force reload (Ctrl+Shift+R or Cmd+Shift+R)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      forceReload();
    }
  });
};
