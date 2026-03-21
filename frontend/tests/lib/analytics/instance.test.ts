import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setAnalytics, getAnalytics, capturePageView, capture } from '@/lib/analytics/instance.js';
import { createNoopAnalytics } from '@/lib/analytics/noopAnalytics.js';

describe('analytics instance', () => {
  beforeEach(() => {
    setAnalytics(createNoopAnalytics());
  });

  afterEach(() => {
    setAnalytics(createNoopAnalytics());
  });

  it('capturePageView no-ops without throwing', () => {
    expect(() => capturePageView()).not.toThrow();
  });

  it('capture no-ops without throwing', () => {
    expect(() => capture('test_event', { foo: 'bar' })).not.toThrow();
  });

  it('getAnalytics returns the set implementation', () => {
    const noop = createNoopAnalytics();
    setAnalytics(noop);
    expect(getAnalytics()).toBe(noop);
  });
});
