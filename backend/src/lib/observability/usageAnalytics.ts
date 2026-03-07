/** Usage by category only; no PII or message text (NFR-6). */

import { UsageCategory, USAGE_CATEGORIES } from '@chatxiv/cdm';

export { UsageCategory, USAGE_CATEGORIES };

export function isUsageCategory(val: unknown): val is UsageCategory {
  return (USAGE_CATEGORIES as readonly unknown[]).includes(val);
}

export interface UsageRecord {
  category: UsageCategory;
  requestId: string;
  timestamp: number;
}

// todo: replace with a real sink
const records: UsageRecord[] = [];
const MAX_RECORDS = 50_000;

export const usageAnalytics = {
  // todo: replace write with a real sink
  record(entry: UsageRecord): void {
    records.push(entry);
    if (records.length > MAX_RECORDS) {
      records.splice(0, records.length - MAX_RECORDS);
    }
  },

  // todo: replace retrieval with a real sink
  getRecords(): UsageRecord[] {
    return [...records];
  },

  // todo: replace retrieval with a real sink
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
