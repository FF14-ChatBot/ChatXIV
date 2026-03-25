import { vi, type Mocked } from 'vitest';
import { USAGE_CATEGORIES } from '@chatxiv/cdm';
import type {
  UsageCategory,
  UsageRecord,
  UsageStore,
} from '@src/lib/observability/usageAnalytics/types.js';

export function createMockUsageStore(): Mocked<UsageStore> {
  const records: UsageRecord[] = [];
  return {
    record: vi.fn((entry: UsageRecord) => {
      records.push({ ...entry });
    }),
    getRecords: vi.fn(() => records.map((r) => ({ ...r }))),
    getCountByCategory: vi.fn((): Record<UsageCategory, number> => {
      const counts = Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<
        UsageCategory,
        number
      >;
      for (const r of records) {
        counts[r.category] = (counts[r.category] ?? 0) + 1;
      }
      return counts;
    }),
  } as Mocked<UsageStore>;
}
