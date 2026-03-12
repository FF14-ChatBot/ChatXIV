import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { requestMetricsMiddleware } from './requestMetrics.js';
import { metrics } from '../lib/observability/metrics.js';

describe('middleware/requestMetricsMiddleware', () => {
  beforeEach(() => {
    metrics.clear();
  });

  function createRes() {
    const handlers: Record<string, Array<() => void>> = {};
    const res = {
      statusCode: 200,
      on: (event: string, fn: () => void) => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(fn);
      },
      _emit: (event: string) => {
        for (const fn of handlers[event] ?? []) fn();
      },
    } as unknown as Response & { _emit: (event: string) => void };
    return res;
  }

  it('uses req.path when req.route is not set', () => {
    const req = { method: 'GET', path: '/x' } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requestMetricsMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();

    res.statusCode = 201;
    res._emit('finish');

    const entries = metrics.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].route).toBe('/x');
    expect(entries[0].statusCode).toBe(201);
  });

  it('uses req.route.path when present', () => {
    const req = { method: 'POST', path: '/ignored', route: { path: '/r' } } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requestMetricsMiddleware(req, res, next);
    res._emit('finish');

    expect(metrics.getEntries()[0].route).toBe('/r');
  });
});
