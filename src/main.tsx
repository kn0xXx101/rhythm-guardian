import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPerformanceMonitoring } from './lib/performance';
import { analytics } from './lib/analytics';
import { initCacheBusting } from './utils/cache-buster';
import { unlockNotificationSoundOnce } from './services/notification';

const STALE_CHUNK_RELOAD_KEY = 'rg_stale_chunk_reload_attempted';

/**
 * After a new deploy, the client may still request old hashed chunks; some hosts serve index.html
 * for unknown paths → "'text/html' is not a valid JavaScript MIME type". One automatic reload
 * usually fixes it; the session key prevents an infinite reload loop if the bundle is truly broken.
 */
function initStaleBundleRecovery(): void {
  const shouldRecover = (msg: string) =>
    /text\/html|not a valid javascript mime|Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(
      msg
    );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
      if (!shouldRecover(msg)) return;
      if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return;
      sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
      console.warn('[Rhythm Guardian] Stale bundle detected; reloading once.');
      window.location.reload();
    },
    { passive: true }
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || '';
      if (!shouldRecover(msg)) return;
      if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return;
      sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
      console.warn('[Rhythm Guardian] Script load error; reloading once.');
      window.location.reload();
    },
    true
  );
}

initStaleBundleRecovery();

// Initialize cache busting
try {
  initCacheBusting();
  console.log('[main.tsx] Cache busting initialized');
} catch (error) {
  console.error('[main.tsx] Error initializing cache busting:', error);
}

// Best-effort unlock for notification sounds (mobile browsers require a user gesture).
if (typeof window !== 'undefined') {
  const unlock = () => unlockNotificationSoundOnce();
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

// Initialize performance monitoring
try {
  initPerformanceMonitoring((metric) => {
    // You can log metrics or send to analytics service here
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Metric]', metric.name, metric.value);
    }
  });
  console.log('[main.tsx] Performance monitoring initialized');
} catch (error) {
  console.error('[main.tsx] Error initializing performance monitoring:', error);
}

// Initialize analytics
try {
  analytics.init();
  console.log('[main.tsx] Analytics initialized');
} catch (error) {
  console.error('[main.tsx] Error initializing analytics:', error);
}

// Track page views
if (typeof window !== 'undefined') {
  analytics.trackPageView(window.location.pathname);
  
  // Track navigation
  window.addEventListener('popstate', () => {
    analytics.trackPageView(window.location.pathname);
  });
}

// Service worker (push) — bypass HTTP cache when checking for updates so new sw.js ships quickly.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
        registration.update().catch(() => {});
        window.setInterval(() => registration.update(), 6 * 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }
  });
}

const root = document.getElementById('root');

console.log('[main.tsx] Root element:', root);
console.log('[main.tsx] Starting React render...');

if (root) {
  try {
    createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('[main.tsx] React render started successfully');
  } catch (error) {
    console.error('[main.tsx] Error rendering React app:', error);
    throw error;
  }
} else {
  console.error('[main.tsx] Root element not found!');
}
