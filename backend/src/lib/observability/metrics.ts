/** In-memory request metrics; bounded to avoid unbounded growth. Replace with a real sink when needed. */

import { Builder } from 'builder-pattern';

export interface RequestMetricEntry {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

// todo: replace with a real sink
const entries: RequestMetricEntry[] = [];
const MAX_ENTRIES = 10_000;

/** Per-route summary returned from getSummary(). */
type RouteMetricSummary = {
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

/** Internal only: we need the durations array to compute percentiles; it is not exposed in RouteMetricSummary. */
type RouteMetricAccumulator = RouteMetricSummary & { durations: number[] };

function percentileNearestRank(sorted: number[], p: number): number {
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

function createEmptyAccumulator(): RouteMetricAccumulator {
  const acc = Builder<RouteMetricAccumulator>()
    .count(0)
    .minDurationMs(Number.POSITIVE_INFINITY)
    .maxDurationMs(0)
    .sumDurationMs(0)
    .avgDurationMs(0)
    .p50DurationMs(0)
    .p90DurationMs(0)
    .p95DurationMs(0)
    .p99DurationMs(0)
    .build();
  acc.durations = []; // fresh array per accumulator (Builder returns shallow copy)
  return acc;
}

function aggregateByRouteAndStatus(entriesList: RequestMetricEntry[]): {
  byRoute: Record<string, RouteMetricAccumulator>;
  byStatus: Record<number, number>;
  totalRequests: number;
} {
  const byRoute: Record<string, RouteMetricAccumulator> = {};
  const byStatus: Record<number, number> = {};
  let totalRequests = 0;
  for (const entry of entriesList) {
    totalRequests += 1;
    const routeKey = `${entry.method} ${entry.route}`;
    if (!byRoute[routeKey]) byRoute[routeKey] = createEmptyAccumulator();
    const routeMetric = byRoute[routeKey];
    routeMetric.count += 1;
    routeMetric.sumDurationMs += entry.durationMs;
    routeMetric.minDurationMs = Math.min(routeMetric.minDurationMs, entry.durationMs);
    routeMetric.maxDurationMs = Math.max(routeMetric.maxDurationMs, entry.durationMs);
    routeMetric.durations.push(entry.durationMs);
    byStatus[entry.statusCode] = (byStatus[entry.statusCode] ?? 0) + 1;
  }
  return { byRoute, byStatus, totalRequests };
}

function computePercentiles(byRoute: Record<string, RouteMetricAccumulator>): void {
  for (const routeMetric of Object.values(byRoute)) {
    const sorted = [...routeMetric.durations].sort((a, b) => a - b);
    routeMetric.avgDurationMs = Math.round(routeMetric.sumDurationMs / routeMetric.count);
    routeMetric.p50DurationMs = percentileNearestRank(sorted, 50);
    routeMetric.p90DurationMs = percentileNearestRank(sorted, 90);
    routeMetric.p95DurationMs = percentileNearestRank(sorted, 95);
    routeMetric.p99DurationMs = percentileNearestRank(sorted, 99);
  }
}

/** Returns summary per route without the internal durations array (not exposed in the API). */
function toRouteSummaries(
  byRoute: Record<string, RouteMetricAccumulator>
): Record<string, RouteMetricSummary> {
  const result: Record<string, RouteMetricSummary> = {};
  for (const [routeKey, routeMetric] of Object.entries(byRoute)) {
    const { durations: _durations, ...metricSummary } = routeMetric;
    void _durations;
    result[routeKey] = metricSummary;
  }
  return result;
}

export const metrics = {
  // todo: replace write with a real sink
  record(entry: RequestMetricEntry): void {
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }
  },

  // todo: replace retrieval with a real sink
  getEntries(): RequestMetricEntry[] {
    return [...entries];
  },

  // todo: replace retrieval with a real sink
  getSummary(): {
    totalRequests: number;
    byRoute: Record<string, RouteMetricSummary>;
    byStatus: Record<number, number>;
  } {
    const { byRoute, byStatus, totalRequests } = aggregateByRouteAndStatus(entries);
    computePercentiles(byRoute);
    return { totalRequests, byRoute: toRouteSummaries(byRoute), byStatus };
  },

  // todo: remove this when we have a real sink
  clear(): void {
    entries.length = 0;
  },
};
