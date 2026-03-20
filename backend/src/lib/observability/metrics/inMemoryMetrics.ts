/** In-memory metrics implementation. Bounded to avoid unbounded growth. */

import type { RequestMetricEntry, MetricsStore, RouteMetricSummary } from './types.js';
import { summarizeRequestMetricEntries } from './aggregateRequestMetrics.js';

const MAX_ENTRIES = 10_000;

/** In-memory metrics store. Inject at app boot via setMetrics(). */
export function createInMemoryMetrics(): MetricsStore {
  const entries: RequestMetricEntry[] = [];
  return {
    record(entry: RequestMetricEntry): void {
      entries.push(entry);
      if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
      }
    },
    getEntries(): RequestMetricEntry[] {
      return [...entries];
    },
    getSummary(): {
      totalRequests: number;
      byRoute: Record<string, RouteMetricSummary>;
      byStatus: Record<number, number>;
    } {
      return summarizeRequestMetricEntries(entries);
    },
    clear(): void {
      entries.length = 0;
    },
  };
}
