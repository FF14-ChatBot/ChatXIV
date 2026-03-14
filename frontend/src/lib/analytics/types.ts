/** Event properties: no PII or message content. Safe: category, requestId, sessionId, timestamps. */
export type AnalyticsEventProperties = Record<string, string | number | boolean | undefined>;

/** Analytics sink interface. Swap implementation at app boot to change provider (PostHog, Highlight, noop, etc.). */
export interface IAnalytics {
  capturePageView(): void;
  capture(event: string, properties?: AnalyticsEventProperties): void;
}
