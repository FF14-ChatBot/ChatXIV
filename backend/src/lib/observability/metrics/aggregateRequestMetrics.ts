/**
 * Pure aggregation for request metrics — shared by in-memory and SQLite stores.
 * Keeps percentile logic identical across implementations.
 */

import { Builder } from 'builder-pattern';
import type { RequestMetricEntry, RouteMetricSummary } from './types.js';

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
  acc.durations = [];
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

/** Build the same summary shape as the in-memory metrics store from a list of entries. */
export function summarizeRequestMetricEntries(entriesList: RequestMetricEntry[]): {
  totalRequests: number;
  byRoute: Record<string, RouteMetricSummary>;
  byStatus: Record<number, number>;
} {
  const { byRoute, byStatus, totalRequests } = aggregateByRouteAndStatus(entriesList);
  computePercentiles(byRoute);
  return { totalRequests, byRoute: toRouteSummaries(byRoute), byStatus };
}
