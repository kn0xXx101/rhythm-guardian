import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPerformanceMonitoring } from './lib/performance';
import { analytics } from './lib/analytics';
import { initCacheBusting } from './utils/cache-buster';

// Initialize cache busting
try {
  initCacheBusting();
  console.log('[main.tsx] Cache busting initialized');
} catch (error) {
  console.error('[main.tsx] Error initializing cache busting:', error);
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

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
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
