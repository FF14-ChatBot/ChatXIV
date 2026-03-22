import type { Analytics } from './types.js';
import { createNoopAnalytics } from './noopAnalytics.js';

let instance: Analytics = createNoopAnalytics();

/** Set the analytics implementation (call once at app boot). Enables swapping PostHog for another provider. */
export function setAnalytics(analytics: Analytics): void {
  instance = analytics;
}

/** Get the current implementation. Prefer using capturePageView/capture from the public API. */
export function getAnalytics(): Analytics {
  return instance;
}

export function capturePageView(): void {
  instance.capturePageView();
}

export function capture(
  event: string,
  properties?: Record<string, string | number | boolean | undefined>
): void {
  instance.capture(event, properties);
}
