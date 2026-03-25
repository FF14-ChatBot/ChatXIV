/** Row shape for `request_metrics` queries (snake_case columns). */
export type RequestMetricRow = {
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  recorded_at: string;
};
