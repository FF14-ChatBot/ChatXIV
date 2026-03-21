import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPostHogAnalytics } from '@/lib/analytics/posthogAnalytics.js';

const mockCapture = vi.fn();
const mockInit = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}));

describe('createPostHogAnalytics', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockInit.mockClear();
    mockCapture.mockClear();
  });

  afterEach(() => {
    vi.stubGlobal('window', originalWindow);
  });

  it('calls posthog.init with token and options when window is defined', () => {
    createPostHogAnalytics({
      token: 'phc_test',
      host: 'https://eu.i.posthog.com',
      capturePageview: true,
      personProfiles: 'always',
    });
    expect(mockInit).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: true,
      person_profiles: 'always',
      defaults: '2026-01-30',
    });
  });

  it('capturePageView calls posthog.capture with $pageview', () => {
    const analytics = createPostHogAnalytics({ token: 't' });
    analytics.capturePageView();
    expect(mockCapture).toHaveBeenCalledWith('$pageview');
  });

  it('capture calls posthog.capture with event and properties', () => {
    const analytics = createPostHogAnalytics({ token: 't' });
    analytics.capture('custom_event', { category: 'bis', count: 1 });
    expect(mockCapture).toHaveBeenCalledWith('custom_event', {
      category: 'bis',
      count: 1,
    });
  });

  it('does not init or capture when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined);
    const analytics = createPostHogAnalytics({ token: 't' });
    expect(mockInit).not.toHaveBeenCalled();
    analytics.capturePageView();
    analytics.capture('e', {});
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
