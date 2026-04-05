import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { UsageAnalyticsMiddleware } from '@src/middleware/usageAnalytics.js';
import { UsageCategory } from '@src/lib/observability/usageAnalytics/types.js';
import { requestContext } from '@src/lib/request/requestContext.js';
import { createMockUsageStore } from '@test/mocks/usageStore.mock.js';

describe('middleware/usageAnalyticsMiddleware', () => {
  function createRes() {
    const handlers: Record<string, Array<() => void>> = {};
    const res = {
      locals: {} as Record<string, unknown>,
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

  it('does not record when handlers do not set usageCategory', () => {
    const usageStore = createMockUsageStore();
    const middleware = new UsageAnalyticsMiddleware(usageStore);
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn();

    requestContext.run({ requestId: 'r1' }, () => {
      middleware.handler(req, res, next);
      res._emit('finish');
    });

    expect(next).toHaveBeenCalledOnce();
    expect(usageStore.getRecords()).toHaveLength(0);
  });

  it('does not record when usageCategory is UNCATEGORIZED (OTHER)', () => {
    const usageStore = createMockUsageStore();
    const middleware = new UsageAnalyticsMiddleware(usageStore);
    const req = {} as Request;
    const res = createRes();
    res.locals.usageCategory = UsageCategory.UNCATEGORIZED;
    const next = vi.fn();

    requestContext.run({ requestId: 'r1' }, () => {
      middleware.handler(req, res, next);
      res._emit('finish');
    });

    expect(usageStore.getRecords()).toHaveLength(0);
  });

  it('records the handler-provided usage category', () => {
    const usageStore = createMockUsageStore();
    const middleware = new UsageAnalyticsMiddleware(usageStore);
    const req = {} as Request;
    const res = createRes();
    res.locals.usageCategory = UsageCategory.BIS;
    const next = vi.fn();

    requestContext.run({ requestId: 'r2' }, () => {
      middleware.handler(req, res, next);
      res._emit('finish');
    });

    expect(usageStore.getRecords()).toHaveLength(1);
    expect(usageStore.getRecords()[0].category).toBe(UsageCategory.BIS);
    expect(usageStore.getRecords()[0].requestId).toBe('r2');
  });

  it("uses requestId 'unknown' when requestContext is missing but category is set", () => {
    const usageStore = createMockUsageStore();
    const middleware = new UsageAnalyticsMiddleware(usageStore);
    const req = {} as Request;
    const res = createRes();
    res.locals.usageCategory = UsageCategory.MSQ;
    const next = vi.fn();

    middleware.handler(req, res, next);
    res._emit('finish');

    expect(usageStore.getRecords()).toHaveLength(1);
    expect(usageStore.getRecords()[0].requestId).toBe('unknown');
  });
});
