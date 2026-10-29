'use client';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { isAnalyticsExcluded } from '../lib/analytics-preference';
export default function SiteAnalytics() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => setEnabled(!isAnalyticsExcluded());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('analytics-preference-change', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('analytics-preference-change', sync); };
  }, []);
  return enabled ? <Analytics beforeSend={event => isAnalyticsExcluded() ? null : event} /> : null;
}
