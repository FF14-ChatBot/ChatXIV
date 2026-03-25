import type { SqliteDatabase } from '../types.js';
import type { RequestMetricRow } from '../models/requestMetricRow.js';
import type { RequestMetricEntry } from '../../../observability/metrics/types.js';

export class RequestMetricsDao {
  private readonly insertStmt;
  private readonly selectAllStmt;
  private readonly countStmt;
  private readonly deleteOldestExcessStmt;

  constructor(db: SqliteDatabase) {
    this.insertStmt = db.prepare(
      `INSERT INTO request_metrics (method, route, status_code, duration_ms, recorded_at)
       VALUES (@method, @route, @status_code, @duration_ms, @recorded_at)`
    );
    this.selectAllStmt = db.prepare(
      `SELECT method, route, status_code, duration_ms, recorded_at
       FROM request_metrics ORDER BY id ASC`
    );
    this.countStmt = db.prepare('SELECT COUNT(*) AS c FROM request_metrics');
    this.deleteOldestExcessStmt = db.prepare(
      `DELETE FROM request_metrics WHERE id IN (
        SELECT id FROM request_metrics ORDER BY recorded_at ASC LIMIT ?
      )`
    );
  }

  insert(entry: RequestMetricEntry): void {
    this.insertStmt.run({
      method: entry.method,
      route: entry.route,
      status_code: entry.statusCode,
      duration_ms: entry.durationMs,
      recorded_at: entry.timestamp,
    });
  }

  selectAll(): RequestMetricEntry[] {
    const rows = this.selectAllStmt.all() as RequestMetricRow[];
    return rows.map((r) => ({
      method: r.method,
      route: r.route,
      statusCode: r.status_code,
      durationMs: r.duration_ms,
      timestamp: r.recorded_at,
    }));
  }

  /** Delete oldest rows when count exceeds `maxRows` (retention sweep). */
  sweepToCap(maxRows: number): void {
    const row = this.countStmt.get() as { c: number };
    if (row.c > maxRows) {
      const excess = row.c - maxRows;
      this.deleteOldestExcessStmt.run(excess);
    }
  }
}
