import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { RequestMetricsMiddleware } from '@src/middleware/requestMetrics.js';
import { createMockMetricsStore } from '@test/mocks/metricsStore.mock.js';

describe('middleware/requestMetricsMiddleware', () => {
  function createRes() {
    const handlers: Record<string, Array<() => void>> = {};
    const res = {
      statusCode: 200,
      locals: {},
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

  it('uses req.path when req.route is not set at finish', () => {
    const metricsStore = createMockMetricsStore();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = { method: 'GET', path: '/x', baseUrl: '' } as unknown as Request;
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

  it('uses baseUrl and req.route.path when set at finish', () => {
    const metricsStore = createMockMetricsStore();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = {
      method: 'PUT',
      path: '/ignored',
      baseUrl: '/v1/admin',
      route: { path: '/flags/:name' },
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    res._emit('finish');

    expect(metricsStore.getEntries()[0].route).toBe('/v1/admin/flags/:name');
  });

  it('does not record metrics for skipped doc mount routes', () => {
    const metricsStore = createMockMetricsStore();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = {
      method: 'GET',
      path: '/swagger-ui.css',
      baseUrl: '/v1/admin/docs',
    } as unknown as Request;
    const res = createRes();
    middleware.handler(req, res, vi.fn());
    res._emit('finish');

    expect(metricsStore.getEntries()).toHaveLength(0);
  });

  it('records statusCode on error responses', () => {
    const metricsStore = createMockMetricsStore();
    const middleware = new RequestMetricsMiddleware(metricsStore);
    const req = { method: 'GET', path: '/nope', baseUrl: '' } as unknown as Request;
    const res = createRes();
    middleware.handler(req, res, vi.fn());
    res.statusCode = 404;
    res._emit('finish');

    expect(metricsStore.getEntries()[0].statusCode).toBe(404);
  });
});
