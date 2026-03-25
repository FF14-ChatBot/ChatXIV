/** Usage analytics contract and data shapes only. No implementation. */

import { UsageCategory, USAGE_CATEGORIES } from '@chatxiv/cdm';

export { UsageCategory, USAGE_CATEGORIES };

export interface UsageRecord {
  category: UsageCategory;
  requestId: string;
  /** ISO 8601 UTC (`Date.prototype.toISOString()`), stored as TEXT in SQLite. */
  timestamp: string;
}

/** Usage store interface. Swap implementation at app boot for a different sink (e.g. SQLite). */
export interface UsageStore {
  record(entry: UsageRecord): void;
  getRecords(): UsageRecord[];
  getCountByCategory(): Record<UsageCategory, number>;
}

export function isUsageCategory(val: unknown): val is UsageCategory {
  return (USAGE_CATEGORIES as readonly unknown[]).includes(val);
}
