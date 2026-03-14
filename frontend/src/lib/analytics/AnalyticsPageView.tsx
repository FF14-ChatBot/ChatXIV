import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { capturePageView } from './instance.js';

/**
 * Render once inside your Router (e.g. in App or root layout). Captures a pageview
 * on every route change so new routes are tracked automatically—no per-page boilerplate.
 */
export function AnalyticsPageView(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    capturePageView();
  }, [pathname]);

  return null;
}
