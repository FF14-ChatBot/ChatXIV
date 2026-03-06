/** Common data model: API contract types and constants shared by backend and frontend. */

export const UsageCategory = {
  UNCATEGORIZED: 'uncategorized',
  BIS: 'bis',
  RAIDING: 'raiding',
  MSQ: 'msq',
  UNLOCKS: 'unlocks',
  SETTINGS: 'settings',
  CRAFTING: 'crafting',
  WHERE_TO_FIND: 'where_to_find',
  PATCH_NOTES: 'patch_notes',
} as const;

export type UsageCategory = (typeof UsageCategory)[keyof typeof UsageCategory];

export const USAGE_CATEGORIES = Object.values(UsageCategory) as UsageCategory[];

/** Response shape for "usage counts by category" dashboard API. */
export type UsageByCategoryResponse = Record<UsageCategory, number>;

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
