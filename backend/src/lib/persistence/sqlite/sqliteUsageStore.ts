/**
 * SQLite-backed UsageStore — delegates persistence to UsageRecordsDao.
 */

import type { SqliteDatabase } from './types.js';
import type { UsageRecord, UsageStore } from '../../observability/usageAnalytics/types.js';
import { UsageRecordsDao } from './dao/UsageRecordsDao.js';

/** @param db - Shared database handle; caller owns lifecycle. */
export function createSqliteUsageStore(db: SqliteDatabase): UsageStore {
  const dao = new UsageRecordsDao(db);
  return {
    record(entry: UsageRecord): void {
      dao.insert(entry);
    },
    getRecords(): UsageRecord[] {
      return dao.selectAll();
    },
    getCountByCategory() {
      return dao.getCountByCategory();
    },
  };
}
