import type { SqliteDatabase } from './types.js';

/** Aligned with prior in-memory caps; enforced by scheduled sweep, not per insert. */
export const MAX_REQUEST_METRICS_ROWS = 10_000;
export const MAX_USAGE_RECORDS_ROWS = 50_000;

/**
 * Delete oldest rows when counts exceed caps. Call from a periodic job (not on every record).
 */
export function sweepObservabilityRetention(db: SqliteDatabase): void {
  const metrics = db.prepare('SELECT COUNT(*) AS c FROM request_metrics').get() as { c: number };
  if (metrics.c > MAX_REQUEST_METRICS_ROWS) {
    const excess = metrics.c - MAX_REQUEST_METRICS_ROWS;
    db.prepare(
      `DELETE FROM request_metrics WHERE id IN (
        SELECT id FROM request_metrics ORDER BY recorded_at ASC LIMIT ?
      )`
    ).run(excess);
  }

  const usage = db.prepare('SELECT COUNT(*) AS c FROM usage_records').get() as { c: number };
  if (usage.c > MAX_USAGE_RECORDS_ROWS) {
    const excess = usage.c - MAX_USAGE_RECORDS_ROWS;
    db.prepare(
      `DELETE FROM usage_records WHERE id IN (
        SELECT id FROM usage_records ORDER BY recorded_at ASC LIMIT ?
      )`
    ).run(excess);
  }
}
