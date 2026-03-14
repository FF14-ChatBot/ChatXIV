export { isDebug } from './debug.js';
export { setLogger, getLogger, logger, createConsoleLogger } from './logger/index.js';
export type { ILogger } from './logger/index.js';
export {
  setAnalytics,
  capturePageView,
  capture,
  createNoopAnalytics,
  createPostHogAnalytics,
  AnalyticsPageView,
} from './analytics/index.js';
export type {
  IAnalytics,
  AnalyticsEventProperties,
  PostHogAnalyticsConfig,
} from './analytics/index.js';
