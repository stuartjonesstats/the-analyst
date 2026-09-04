type AnalyticsParameter = string | number | boolean;

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, parameters?: Record<string, AnalyticsParameter>) => void;
  }
}

/**
 * Record coarse product usage only. Callers must never pass learner-authored
 * prose, names, code, query results, file contents, or other workspace data.
 */
export function trackPublicEvent(name: string, parameters: Record<string, AnalyticsParameter> = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, parameters);
}

