import type { Analytics } from './types.js';

/** No-op implementation. Use when analytics is disabled or for tests. */
export function createNoopAnalytics(): Analytics {
  return {
    capturePageView(): void {},
    capture(): void {},
  };
}
