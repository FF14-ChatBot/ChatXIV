import { describe, it, expect, beforeEach } from 'vitest';
import { UsageCategory, usageAnalytics } from './usageAnalytics.js';

describe('lib/observability/usageAnalytics', () => {
  beforeEach(() => {
    usageAnalytics.clear();
  });

  it('records and returns records as copies', () => {
    usageAnalytics.record({ category: UsageCategory.BIS, requestId: 'r1', timestamp: 1 });
    const a = usageAnalytics.getRecords();
    const b = usageAnalytics.getRecords();

    expect(a).toEqual([{ category: UsageCategory.BIS, requestId: 'r1', timestamp: 1 }]);
    expect(b).toEqual(a);

    a.push({ category: UsageCategory.MSQ, requestId: 'r2', timestamp: 2 });
    expect(usageAnalytics.getRecords()).toHaveLength(1);
  });

  describe('getCountByCategory()', () => {
    it('initializes all categories at 0 and counts recorded categories', () => {
      usageAnalytics.record({ category: UsageCategory.BIS, requestId: 'r1', timestamp: 1 });
      usageAnalytics.record({ category: UsageCategory.BIS, requestId: 'r2', timestamp: 2 });
      usageAnalytics.record({ category: UsageCategory.SETTINGS, requestId: 'r3', timestamp: 3 });

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
        timestamp: 1,
      });
      const counts = usageAnalytics.getCountByCategory() as Record<string, number>;
      expect(counts['not_a_real_category']).toBe(1);
    });
  });

  it('bounds memory by trimming old records', () => {
    for (let i = 0; i < 50_010; i++) {
      usageAnalytics.record({ category: UsageCategory.BIS, requestId: `r${i}`, timestamp: i });
    }
    const records = usageAnalytics.getRecords();
    expect(records).toHaveLength(50_000);
    expect(records[0].requestId).toBe('r10');
  });
});
