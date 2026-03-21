import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setMetrics, getMetrics, metrics } from '@src/lib/observability/metricsInstance.js';
import { createInMemoryMetrics } from '@src/lib/observability/metrics/inMemoryMetrics.js';

describe('metricsInstance', () => {
  beforeEach(() => {
    setMetrics(createInMemoryMetrics());
  });

  it('getMetrics throws when setMetrics was not called', async () => {
    vi.resetModules();
    const { getMetrics: getMetricsFresh } =
      await import('@src/lib/observability/metricsInstance.js');
    expect(() => getMetricsFresh()).toThrow('Metrics store not initialized');
  });

  it('setMetrics and getMetrics return the same store', () => {
    const store = createInMemoryMetrics();
    setMetrics(store);
    expect(getMetrics()).toBe(store);
  });

  it('metrics delegates to getMetrics', () => {
    metrics.record({
      method: 'GET',
      route: '/x',
      statusCode: 200,
      durationMs: 1,
      timestamp: 1,
    });
    expect(getMetrics().getEntries()).toHaveLength(1);
    expect(metrics.getSummary().totalRequests).toBe(1);
    metrics.clear();
    expect(metrics.getEntries()).toHaveLength(0);
  });
});
