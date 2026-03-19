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

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  NO_SOURCED_ANSWER: 'NO_SOURCED_ANSWER',
  REFUSAL: 'REFUSAL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const DEFAULT_HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.REQUEST_TIMEOUT]: 408,
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 413,
  [ERROR_CODES.SOURCE_UNAVAILABLE]: 503,
  [ERROR_CODES.NO_SOURCED_ANSWER]: 404,
  [ERROR_CODES.REFUSAL]: 422,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  requestId?: string;
  /** Omitted in production. */
  stack?: string;
}

/** Feature flag entry with metadata (admin detail view). */
export interface FeatureFlagEntry {
  readonly name: string;
  readonly enabled: boolean;
  readonly updatedAt: string;
}

/** Public flags response consumed by the frontend. */
export type FeatureFlagsResponse = Readonly<Record<string, boolean>>;
