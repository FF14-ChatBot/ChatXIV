import type { SqliteDatabase } from '../types.js';
import type { RequestMetricEntry } from '../../../observability/metrics/types.js';

type MetricRow = {
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  recorded_at: number;
};

export class RequestMetricsDao {
  private readonly insertStmt;
  private readonly selectAllStmt;

  constructor(db: SqliteDatabase) {
    this.insertStmt = db.prepare(
      `INSERT INTO request_metrics (method, route, status_code, duration_ms, recorded_at)
       VALUES (@method, @route, @status_code, @duration_ms, @recorded_at)`
    );
    this.selectAllStmt = db.prepare(
      `SELECT method, route, status_code, duration_ms, recorded_at
       FROM request_metrics ORDER BY id ASC`
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
    const rows = this.selectAllStmt.all() as MetricRow[];
    return rows.map((r) => ({
      method: r.method,
      route: r.route,
      statusCode: r.status_code,
      durationMs: r.duration_ms,
      timestamp: r.recorded_at,
    }));
  }
}
