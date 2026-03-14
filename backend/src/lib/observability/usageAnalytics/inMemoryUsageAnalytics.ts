/** In-memory usage analytics implementation. Bounded to avoid unbounded growth. */

import { USAGE_CATEGORIES } from '@chatxiv/cdm';
import type { UsageRecord, IUsageStore, UsageCategory } from './types.js';

const MAX_RECORDS = 50_000;

/** In-memory usage store. Inject at app boot via setUsageAnalytics(). */
export function createInMemoryUsageAnalytics(): IUsageStore {
  const records: UsageRecord[] = [];
  return {
    record(entry: UsageRecord): void {
      records.push(entry);
      if (records.length > MAX_RECORDS) {
        records.splice(0, records.length - MAX_RECORDS);
      }
    },
    getRecords(): UsageRecord[] {
      return [...records];
    },
    getCountByCategory(): Record<UsageCategory, number> {
      const counts = Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<
        UsageCategory,
        number
      >;
      for (const r of records) {
        counts[r.category] = (counts[r.category] ?? 0) + 1;
      }
      return counts;
    },
    clear(): void {
      records.length = 0;
    },
  };
}
