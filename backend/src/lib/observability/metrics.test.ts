import { describe, it, expect, beforeEach } from 'vitest';
import { metrics } from './metrics.js';

describe('lib/observability/metrics', () => {
  beforeEach(() => {
    metrics.clear();
  });

  it('records and returns entries as copies', () => {
    metrics.record({
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: 10,
      timestamp: 1,
    });
    const a = metrics.getEntries();
    const b = metrics.getEntries();

    expect(a).toEqual([
      { method: 'GET', route: '/health', statusCode: 200, durationMs: 10, timestamp: 1 },
    ]);
    expect(b).toEqual(a);

    a.push({ method: 'X', route: 'Y', statusCode: 500, durationMs: 0, timestamp: 2 });
    expect(metrics.getEntries()).toHaveLength(1);
  });

  describe('getSummary()', () => {
    it('aggregates by route and status', () => {
      metrics.record({ method: 'GET', route: '/a', statusCode: 200, durationMs: 5, timestamp: 1 });
      metrics.record({ method: 'GET', route: '/a', statusCode: 200, durationMs: 7, timestamp: 2 });
      metrics.record({ method: 'POST', route: '/b', statusCode: 500, durationMs: 3, timestamp: 3 });

      const summary = metrics.getSummary();
      expect(summary.totalRequests).toBe(3);
      expect(summary.byRoute).toEqual({
        'GET /a': {
          count: 2,
          minDurationMs: 5,
          maxDurationMs: 7,
          sumDurationMs: 12,
          avgDurationMs: 6,
          p50DurationMs: 5,
          p90DurationMs: 7,
          p95DurationMs: 7,
          p99DurationMs: 7,
        },
        'POST /b': {
          count: 1,
          minDurationMs: 3,
          maxDurationMs: 3,
          sumDurationMs: 3,
          avgDurationMs: 3,
          p50DurationMs: 3,
          p90DurationMs: 3,
          p95DurationMs: 3,
          p99DurationMs: 3,
        },
      });
      expect(summary.byStatus).toEqual({ 200: 2, 500: 1 });
    });
  });

  it('bounds memory by trimming old entries', () => {
    for (let i = 0; i < 10_005; i++) {
      metrics.record({ method: 'GET', route: '/x', statusCode: 200, durationMs: i, timestamp: i });
    }
    const entries = metrics.getEntries();
    expect(entries).toHaveLength(10_000);
    expect(entries[0].durationMs).toBe(5);
  });
});
