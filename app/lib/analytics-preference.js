// Per browser and site origin; never use device fingerprinting or IP matching.
export const ANALYTICS_EXCLUDED_KEY = 'subway_ai_guide_analytics_excluded';
export function isAnalyticsExcluded() {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(ANALYTICS_EXCLUDED_KEY) === '1'; }
  catch { return false; }
}
