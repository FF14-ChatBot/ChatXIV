import { describe, it, expect } from 'vitest';
import { summarizeRequestMetricEntries } from './aggregateRequestMetrics.js';

describe('summarizeRequestMetricEntries', () => {
  it('aggregates by route and status', () => {
    const summary = summarizeRequestMetricEntries([
      { method: 'GET', route: '/a', statusCode: 200, durationMs: 10, timestamp: 1 },
      { method: 'GET', route: '/a', statusCode: 200, durationMs: 30, timestamp: 2 },
      { method: 'POST', route: '/b', statusCode: 201, durationMs: 5, timestamp: 3 },
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
