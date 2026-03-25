import { describe, it, expect, beforeEach } from 'vitest';
import { UsageCategory } from '@src/lib/observability/usageAnalytics/types.js';
import {
  setUsageAnalytics,
  usageAnalytics,
} from '@src/lib/observability/usageAnalyticsInstance.js';
import { createMockUsageStore } from '@test/mocks/usageStore.mock.js';

describe('lib/observability/usageAnalytics', () => {
  beforeEach(() => {
    setUsageAnalytics(createMockUsageStore());
  });

  it('records and returns records as copies', () => {
    usageAnalytics.record({
      category: UsageCategory.BIS,
      requestId: 'r1',
      timestamp: '1970-01-01T00:00:00.001Z',
    });
    const a = usageAnalytics.getRecords();
    const b = usageAnalytics.getRecords();

    expect(a).toEqual([
      { category: UsageCategory.BIS, requestId: 'r1', timestamp: '1970-01-01T00:00:00.001Z' },
    ]);
    expect(b).toEqual(a);

    a.push({
      category: UsageCategory.MSQ,
      requestId: 'r2',
      timestamp: '1970-01-01T00:00:00.002Z',
    });
    expect(usageAnalytics.getRecords()).toHaveLength(1);
  });

  describe('getCountByCategory()', () => {
    it('initializes all categories at 0 and counts recorded categories', () => {
      usageAnalytics.record({
        category: UsageCategory.BIS,
        requestId: 'r1',
        timestamp: '1970-01-01T00:00:00.001Z',
      });
      usageAnalytics.record({
        category: UsageCategory.BIS,
        requestId: 'r2',
        timestamp: '1970-01-01T00:00:00.002Z',
      });
      usageAnalytics.record({
        category: UsageCategory.SETTINGS,
        requestId: 'r3',
        timestamp: '1970-01-01T00:00:00.003Z',
      });

      const counts = usageAnalytics.getCountByCategory();
      expect(counts[UsageCategory.BIS]).toBe(2);
      expect(counts[UsageCategory.SETTINGS]).toBe(1);
      expect(counts[UsageCategory.UNCATEGORIZED]).toBe(0);
      expect(Object.keys(counts).sort()).toEqual(Object.values(UsageCategory).sort());
    });

    it('handles unknown categories defensively at runtime', () => {
      usageAnalytics.record({
        category: 'not_a_real_category' as UsageCategory,
        requestId: 'r1',
        timestamp: '1970-01-01T00:00:00.000Z',
      });
      const counts = usageAnalytics.getCountByCategory() as Record<string, number>;
      expect(counts['not_a_real_category']).toBe(1);
    });
  });
});
