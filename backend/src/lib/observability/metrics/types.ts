/** Metrics contract and data shapes only. No implementation. */

export interface RequestMetricEntry {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  /** ISO 8601 UTC string (`Date.prototype.toISOString()`), stored as TEXT in SQLite. */
  timestamp: string;
}

/** Per-route summary returned from getSummary(). */
export type RouteMetricSummary = {
  count: number;
  minDurationMs: number;
  maxDurationMs: number;
  sumDurationMs: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p90DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
};

/** Metrics store interface. Swap implementation at app boot for a different sink (e.g. SQLite). */
export interface MetricsStore {
  record(entry: RequestMetricEntry): void;
  getEntries(): RequestMetricEntry[];
  getSummary(): {
    totalRequests: number;
    byRoute: Record<string, RouteMetricSummary>;
    byStatus: Record<number, number>;
  };
}
