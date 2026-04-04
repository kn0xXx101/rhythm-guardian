/**
 * Analytics service for tracking user interactions
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private userId: string | null = null;
  private enabled: boolean = true;

  /**
   * Initialize analytics service
   */
  init(userId?: string) {
    this.userId = userId || null;
    this.enabled = typeof window !== 'undefined';
  }

  /**
   * Track page view
   */
  trackPageView(path: string, title?: string) {
    if (!this.enabled) return;

    this.track('page_view', {
      path,
      title: title || document.title,
    });
  }

  /**
   * Track user interaction event
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      userId: this.userId || undefined,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Send to analytics service
    this.sendEvent(event);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event.name, event.properties);
    }
  }

  /**
   * Track conversion funnel step
   */
  trackConversion(step: string, properties?: Record<string, any>) {
    this.track('conversion', {
      step,
      ...properties,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, properties?: Record<string, any>) {
    this.track('feature_usage', {
      feature: featureName,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Send event to analytics endpoint
   */
  private async sendEvent(event: AnalyticsEvent) {
    try {
      // Example: Send to your analytics endpoint
      // await fetch('/api/analytics/track', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });

      // For now, store in localStorage as backup
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('analytics_events');
        const events = stored ? JSON.parse(stored) : [];
        events.push(event);
        // Keep only last 100 events
        if (events.length > 100) {
          events.shift();
        }
        localStorage.setItem('analytics_events', JSON.stringify(events));
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  /**
   * Get stored events (for debugging)
   */
  getStoredEvents(): AnalyticsEvent[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('analytics_events');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  }

  /**
   * Clear stored events
   */
  clearStoredEvents() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('analytics_events');
    }
  }

  /**
   * Set user ID
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();


