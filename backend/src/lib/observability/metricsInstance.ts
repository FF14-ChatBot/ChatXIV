import type { MetricsStore, RequestMetricEntry, RouteMetricSummary } from './metrics/types.js';

let instance: MetricsStore | null = null;

/** Set the metrics store (called by DI container on load). Required before first use of metrics/getMetrics. */
export function setMetrics(store: MetricsStore): void {
  instance = store;
}

/** @internal Vitest — reset singleton so `register()` can run again in another test file. */
export function resetMetricsStoreSingletonForTests(): void {
  instance = null;
}

/** Get the current store. Throws if setMetrics() has not been called. */
export function getMetrics(): MetricsStore {
  if (instance === null) {
    throw new Error(
      'Metrics store not initialized. Ensure the DI container is imported (e.g. from app.ts) so setMetrics() runs.'
    );
  }
  return instance;
}

/** Delegating object for backward compat. Use getMetrics() in new code when you need the store. */
export const metrics: MetricsStore = {
  record(entry: RequestMetricEntry): void {
    getMetrics().record(entry);
  },
  getEntries(): RequestMetricEntry[] {
    return getMetrics().getEntries();
  },
  getSummary(): {
    totalRequests: number;
    byRoute: Record<string, RouteMetricSummary>;
    byStatus: Record<number, number>;
  } {
    return getMetrics().getSummary();
  },
};
