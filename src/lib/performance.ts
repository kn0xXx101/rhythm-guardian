import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface PerformanceMetrics {
  cls: Metric | null;
  inp: Metric | null;
  fcp: Metric | null;
  lcp: Metric | null;
  ttfb: Metric | null;
}

const metrics: PerformanceMetrics = {
  cls: null,
  inp: null,
  fcp: null,
  lcp: null,
  ttfb: null,
};

/**
 * Callback to handle performance metrics
 */
type MetricCallback = (metric: Metric) => void;

/**
 * Initialize web vitals tracking
 */
export function initPerformanceMonitoring(onMetric?: MetricCallback) {
  // CLS - Cumulative Layout Shift
  onCLS((metric) => {
    metrics.cls = metric;
    onMetric?.(metric);
    // Send to analytics
    sendMetricToAnalytics(metric);
  });

  // INP - Interaction to Next Paint
  onINP((metric) => {
    metrics.inp = metric;
    onMetric?.(metric);
    sendMetricToAnalytics(metric);
  });

  // FCP - First Contentful Paint
  onFCP((metric) => {
    metrics.fcp = metric;
    onMetric?.(metric);
    sendMetricToAnalytics(metric);
  });

  // LCP - Largest Contentful Paint
  onLCP((metric) => {
    metrics.lcp = metric;
    onMetric?.(metric);
    sendMetricToAnalytics(metric);
  });

  // TTFB - Time to First Byte
  onTTFB((metric) => {
    metrics.ttfb = metric;
    onMetric?.(metric);
    sendMetricToAnalytics(metric);
  });
}

/**
 * Send metric to analytics service
 */
function sendMetricToAnalytics(metric: Metric) {
  // You can integrate with your analytics service here
  // For example: Google Analytics, Plausible, etc.
  
  // Using performance API for now
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance]', metric.name, metric.value, metric.id);
    }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics/performance', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     name: metric.name,
    //     value: metric.value,
    //     id: metric.id,
    //     rating: metric.rating,
    //   }),
    // }).catch(console.error);
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Get performance score based on metrics
 */
export function getPerformanceScore(): number {
  const scores: number[] = [];

  // CLS: Good < 0.1, Needs Improvement < 0.25
  if (metrics.cls) {
    scores.push(metrics.cls.value < 0.1 ? 100 : metrics.cls.value < 0.25 ? 75 : 50);
  }

  // INP: Good < 200ms, Needs Improvement < 500ms
  if (metrics.inp) {
    scores.push(metrics.inp.value < 200 ? 100 : metrics.inp.value < 500 ? 75 : 50);
  }

  // FCP: Good < 1.8s, Needs Improvement < 3.0s
  if (metrics.fcp) {
    scores.push(metrics.fcp.value < 1800 ? 100 : metrics.fcp.value < 3000 ? 75 : 50);
  }

  // LCP: Good < 2.5s, Needs Improvement < 4.0s
  if (metrics.lcp) {
    scores.push(metrics.lcp.value < 2500 ? 100 : metrics.lcp.value < 4000 ? 75 : 50);
  }

  // TTFB: Good < 800ms, Needs Improvement < 1.8s
  if (metrics.ttfb) {
    scores.push(metrics.ttfb.value < 800 ? 100 : metrics.ttfb.value < 1800 ? 75 : 50);
  }

  if (scores.length === 0) return 0;

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}


