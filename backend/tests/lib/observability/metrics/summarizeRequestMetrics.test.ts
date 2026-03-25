import { describe, it, expect } from 'vitest';
import { summarizeRequestMetricEntries } from '@src/lib/observability/metrics/summarizeRequestMetrics.js';

describe('summarizeRequestMetricEntries', () => {
  it('aggregates by route and status', () => {
    const summary = summarizeRequestMetricEntries([
      {
        method: 'GET',
        route: '/a',
        statusCode: 200,
        durationMs: 10,
        timestamp: '1970-01-01T00:00:00.001Z',
      },
      {
        method: 'GET',
        route: '/a',
        statusCode: 200,
        durationMs: 30,
        timestamp: '1970-01-01T00:00:00.002Z',
      },
      {
        method: 'POST',
        route: '/b',
        statusCode: 201,
        durationMs: 5,
        timestamp: '1970-01-01T00:00:00.003Z',
      },
    ]);
    expect(summary.totalRequests).toBe(3);
    expect(summary.byStatus[200]).toBe(2);
    expect(summary.byStatus[201]).toBe(1);
    const a = summary.byRoute['GET /a'];
    expect(a.count).toBe(2);
    expect(a.minDurationMs).toBe(10);
    expect(a.maxDurationMs).toBe(30);
  });
});
