import posthog, { type ConfigDefaults } from 'posthog-js';
import type { IAnalytics } from './types.js';

export interface PostHogAnalyticsConfig {
  token: string;
  host?: string;
  capturePageview?: boolean;
  personProfiles?: 'always' | 'identified_only' | 'never';
  defaults?: ConfigDefaults;
}

/**
 * PostHog implementation of IAnalytics. Inits the SDK and returns an implementation.
 * Only this file imports posthog-js; swap by using a different implementation at boot.
 */
export function createPostHogAnalytics(config: PostHogAnalyticsConfig): IAnalytics {
  const {
    token,
    host = 'https://us.i.posthog.com',
    capturePageview = false,
    personProfiles = 'identified_only',
    defaults = '2026-01-30',
  } = config;

  if (typeof window !== 'undefined') {
    posthog.init(token, {
      api_host: host,
      capture_pageview: capturePageview,
      person_profiles: personProfiles,
      defaults,
    });
  }

  return {
    capturePageView(): void {
      if (typeof window === 'undefined') return;
      posthog.capture('$pageview');
    },
    capture(
      event: string,
      properties?: Record<string, string | number | boolean | undefined>
    ): void {
      if (typeof window === 'undefined') return;
      posthog.capture(event, properties);
    },
  };
}
