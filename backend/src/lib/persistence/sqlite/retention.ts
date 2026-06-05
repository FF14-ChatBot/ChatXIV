import type { RequestMetricsDao } from './dao/RequestMetricsDao.js';
import type { UsageRecordsDao } from './dao/UsageRecordsDao.js';

/** Aligned with prior in-memory caps; enforced by scheduled sweep, not per insert. */
export const MAX_REQUEST_METRICS_ROWS = 10_000;
export const MAX_USAGE_RECORDS_ROWS = 50_000;

/**
 * Trim oldest rows via DAOs when counts exceed caps. Invoked from the UTC scheduled job in
 * `lib/scheduler/scheduledJobs.ts` (not on every insert).
 */
export function sweepObservabilityRetention(
  metricsDao: RequestMetricsDao,
  usageDao: UsageRecordsDao
): void {
  metricsDao.sweepToCap(MAX_REQUEST_METRICS_ROWS);
  usageDao.sweepToCap(MAX_USAGE_RECORDS_ROWS);
}
