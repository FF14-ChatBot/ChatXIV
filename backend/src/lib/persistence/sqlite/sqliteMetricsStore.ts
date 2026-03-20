/**
 * SQLite-backed MetricsStore — same contract as in-memory (see Observability-Sink-Interfaces-And-DI.md).
 */

import type { SqliteDatabase } from './types.js';
import type { MetricsStore, RequestMetricEntry } from '../../observability/metrics/types.js';
import { summarizeRequestMetricEntries } from '../../observability/metrics/aggregateRequestMetrics.js';

/** Match in-memory cap (see inMemoryMetrics.ts). */
const MAX_ROWS = 10_000;

type MetricRow = {
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  recorded_at: number;
};

function rowsToEntries(rows: MetricRow[]): RequestMetricEntry[] {
  return rows.map((r) => ({
    method: r.method,
    route: r.route,
    statusCode: r.status_code,
    durationMs: r.duration_ms,
    timestamp: r.recorded_at,
  }));
}

function trimOldMetrics(db: SqliteDatabase): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM request_metrics').get() as { c: number };
  if (row.c <= MAX_ROWS) return;
  const excess = row.c - MAX_ROWS;
  db.prepare(
    `DELETE FROM request_metrics WHERE id IN (
      SELECT id FROM request_metrics ORDER BY recorded_at ASC LIMIT ?
    )`
  ).run(excess);
}

/** @param db - Shared database handle; caller owns lifecycle. */
export function createSqliteMetricsStore(db: SqliteDatabase): MetricsStore {
  const insert = db.prepare(
    `INSERT INTO request_metrics (method, route, status_code, duration_ms, recorded_at)
     VALUES (@method, @route, @status_code, @duration_ms, @recorded_at)`
  );

  const selectAll = db.prepare(
    `SELECT method, route, status_code, duration_ms, recorded_at
     FROM request_metrics ORDER BY id ASC`
  );

  return {
    record(entry: RequestMetricEntry): void {
      insert.run({
        method: entry.method,
        route: entry.route,
        status_code: entry.statusCode,
        duration_ms: entry.durationMs,
        recorded_at: entry.timestamp,
      });
      trimOldMetrics(db);
    },
    getEntries(): RequestMetricEntry[] {
      const rows = selectAll.all() as MetricRow[];
      return rowsToEntries(rows);
    },
    getSummary() {
      return summarizeRequestMetricEntries(this.getEntries());
    },
    clear(): void {
      db.prepare('DELETE FROM request_metrics').run();
    },
  };
}
