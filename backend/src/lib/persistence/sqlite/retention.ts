import type { RequestMetricsDao } from './dao/RequestMetricsDao.js';
import type { UsageRecordsDao } from './dao/UsageRecordsDao.js';

/** Aligned with prior in-memory caps; enforced by scheduled sweep, not per insert. */
export const MAX_REQUEST_METRICS_ROWS = 10_000;
export const MAX_USAGE_RECORDS_ROWS = 50_000;

/**
 * How often the process runs an observability retention sweep.
 * Weekly is enough for trimming high-volume tables; adjust if ops uses external batch jobs.
 */
export const OBSERVABILITY_RETENTION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Trim oldest rows via DAOs when counts exceed caps. Call from a periodic job (not on every record).
 */
export function sweepObservabilityRetention(
  metricsDao: RequestMetricsDao,
  usageDao: UsageRecordsDao
): void {
  metricsDao.sweepToCap(MAX_REQUEST_METRICS_ROWS);
  usageDao.sweepToCap(MAX_USAGE_RECORDS_ROWS);
}
