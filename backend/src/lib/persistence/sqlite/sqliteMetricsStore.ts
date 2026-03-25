/**
 * SQLite-backed MetricsStore — delegates persistence to RequestMetricsDao.
 */

import type { SqliteDatabase } from './types.js';
import type { MetricsStore, RequestMetricEntry } from '../../observability/metrics/types.js';
import { summarizeRequestMetricEntries } from '../../observability/metrics/summarizeRequestMetrics.js';
import { RequestMetricsDao } from './dao/RequestMetricsDao.js';

/** @param db - Shared database handle; caller owns lifecycle. */
export function createSqliteMetricsStore(db: SqliteDatabase): MetricsStore {
  const dao = new RequestMetricsDao(db);
  return {
    record(entry: RequestMetricEntry): void {
      dao.insert(entry);
    },
    getEntries(): RequestMetricEntry[] {
      return dao.selectAll();
    },
    getSummary() {
      return summarizeRequestMetricEntries(dao.selectAll());
    },
  };
}
