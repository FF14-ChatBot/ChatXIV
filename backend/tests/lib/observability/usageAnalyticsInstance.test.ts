import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsageCategory } from '@src/lib/observability/usageAnalytics/types.js';
import {
  setUsageAnalytics,
  getUsageAnalytics,
  usageAnalytics,
} from '@src/lib/observability/usageAnalyticsInstance.js';
import { createMockUsageStore } from '@test/mocks/usageStore.mock.js';

describe('usageAnalyticsInstance', () => {
  beforeEach(() => {
    setUsageAnalytics(createMockUsageStore());
  });

  it('getUsageAnalytics throws when setUsageAnalytics was not called', async () => {
    vi.resetModules();
    const { getUsageAnalytics: getUsageFresh } =
      await import('@src/lib/observability/usageAnalyticsInstance.js');
    expect(() => getUsageFresh()).toThrow('Usage analytics store not initialized');
  });

  it('setUsageAnalytics and getUsageAnalytics return the same store', () => {
    const store = createMockUsageStore();
    setUsageAnalytics(store);
    expect(getUsageAnalytics()).toBe(store);
  });

  it('usageAnalytics delegates to getUsageAnalytics', () => {
    usageAnalytics.record({
      category: UsageCategory.BIS,
      requestId: 'r1',
      timestamp: 1,
    });
    expect(getUsageAnalytics().getRecords()).toHaveLength(1);
    expect(usageAnalytics.getCountByCategory()[UsageCategory.BIS]).toBe(1);
    setUsageAnalytics(createMockUsageStore());
    expect(usageAnalytics.getRecords()).toHaveLength(0);
  });
});
