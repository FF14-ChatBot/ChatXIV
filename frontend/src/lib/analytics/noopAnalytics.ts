import type { IAnalytics } from './types.js';

/** No-op implementation. Use when analytics is disabled or for tests. */
export function createNoopAnalytics(): IAnalytics {
  return {
    capturePageView(): void {},
    capture(): void {},
  };
}
