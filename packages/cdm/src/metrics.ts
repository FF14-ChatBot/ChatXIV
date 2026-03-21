/** Per-route metrics summary (dashboard API). */
export interface RouteMetricSummary {
  count: number;
  minDurationMs: number;
  maxDurationMs: number;
  sumDurationMs: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p90DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
}

/** Response shape for "metrics summary" dashboard API. */
export type MetricsSummaryResponse = {
  totalRequests: number;
  byRoute: Record<string, RouteMetricSummary>;
  byStatus: Record<number, number>;
};
