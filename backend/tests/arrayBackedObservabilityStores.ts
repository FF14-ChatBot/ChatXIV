/**
 * Test-only in-process stores (no SQLite). Keeps MetricsStore / UsageStore contracts without `clear()`.
 */

import { USAGE_CATEGORIES } from '@chatxiv/cdm';
import { summarizeRequestMetricEntries } from '@src/lib/observability/metrics/aggregateRequestMetrics.js';
import type { MetricsStore, RequestMetricEntry } from '@src/lib/observability/metrics/types.js';
import type {
  UsageCategory,
  UsageRecord,
  UsageStore,
} from '@src/lib/observability/usageAnalytics/types.js';

export function createArrayBackedMetricsStore(): MetricsStore {
  const entries: RequestMetricEntry[] = [];
  return {
    record(entry: RequestMetricEntry): void {
      entries.push({ ...entry });
    },
    getEntries(): RequestMetricEntry[] {
      return entries.map((e) => ({ ...e }));
    },
    getSummary() {
      return summarizeRequestMetricEntries(entries.map((e) => ({ ...e })));
    },
  };
}

export function createArrayBackedUsageStore(): UsageStore {
  const records: UsageRecord[] = [];
  return {
    record(entry: UsageRecord): void {
      records.push({ ...entry });
    },
    getRecords(): UsageRecord[] {
      return records.map((r) => ({ ...r }));
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
  };
}
