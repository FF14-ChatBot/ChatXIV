import type { IMetricsStore, RequestMetricEntry, RouteMetricSummary } from './metrics/index.js';

let instance: IMetricsStore | null = null;

/** Set the metrics store (called by DI container on load). Required before first use of metrics/getMetrics. */
export function setMetrics(store: IMetricsStore): void {
  instance = store;
}

/** Get the current store. Throws if setMetrics() has not been called. */
export function getMetrics(): IMetricsStore {
  if (instance === null) {
    throw new Error(
      'Metrics store not initialized. Ensure the DI container is imported (e.g. from app.ts) so setMetrics() runs.'
    );
  }
  return instance;
}

/** Delegating object for backward compat. Use getMetrics() in new code when you need the store. */
export const metrics: IMetricsStore = {
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
  clear(): void {
    getMetrics().clear();
  },
};
