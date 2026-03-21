import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { RequestMetricsMiddleware } from '@src/middleware/requestMetrics.js';
import { createInMemoryMetrics } from '@src/lib/observability/metrics/inMemoryMetrics.js';

describe('middleware/requestMetricsMiddleware', () => {
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
    const metricsStore = createInMemoryMetrics();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = { method: 'GET', path: '/x' } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    expect(next).toHaveBeenCalledOnce();

    res.statusCode = 201;
    res._emit('finish');

    const entries = metricsStore.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].route).toBe('/x');
    expect(entries[0].statusCode).toBe(201);
  });

  it('uses req.route.path when present', () => {
    const metricsStore = createInMemoryMetrics();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = { method: 'POST', path: '/ignored', route: { path: '/r' } } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    res._emit('finish');

    expect(metricsStore.getEntries()[0].route).toBe('/r');
  });
});
