import { vi, type Mocked } from 'vitest';
import { summarizeRequestMetricEntries } from '@src/lib/observability/metrics/summarizeRequestMetrics.js';
import type { MetricsStore, RequestMetricEntry } from '@src/lib/observability/metrics/types.js';

export function createMockMetricsStore(): Mocked<MetricsStore> {
  const entries: RequestMetricEntry[] = [];
  return {
    record: vi.fn((entry: RequestMetricEntry) => {
      entries.push({ ...entry });
    }),
    getEntries: vi.fn(() => entries.map((e) => ({ ...e }))),
    getSummary: vi.fn(() => summarizeRequestMetricEntries(entries.map((e) => ({ ...e })))),
  } as Mocked<MetricsStore>;
}
