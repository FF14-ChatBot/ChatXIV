import type { IAnalytics } from './types.js';
import { createNoopAnalytics } from './noopAnalytics.js';

let instance: IAnalytics = createNoopAnalytics();

/** Set the analytics implementation (call once at app boot). Enables swapping PostHog for another provider. */
export function setAnalytics(analytics: IAnalytics): void {
  instance = analytics;
}

/** Get the current implementation. Prefer using capturePageView/capture from the public API. */
export function getAnalytics(): IAnalytics {
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
