import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { usageAnalyticsMiddleware } from './usageAnalytics.js';
import { usageAnalytics, UsageCategory } from '../lib/observability/usageAnalytics.js';
import { requestContext } from '../lib/request/requestContext.js';

describe('middleware/usageAnalyticsMiddleware', () => {
  beforeEach(() => {
    usageAnalytics.clear();
  });

  function createRes() {
    const handlers: Record<string, Array<() => void>> = {};
    const res = {
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

  it('records uncategorized usage when handlers do not set a category', () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn();

    requestContext.run({ requestId: 'r1' }, () => {
      usageAnalyticsMiddleware(req, res, next);
      res._emit('finish');
    });

    expect(next).toHaveBeenCalledOnce();
    const records = usageAnalytics.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].category).toBe(UsageCategory.UNCATEGORIZED);
    expect(records[0].requestId).toBe('r1');
  });

  it('records the handler-provided usage category', () => {
    const req = {} as Request;
    const res = createRes();
    res.locals.usageCategory = UsageCategory.BIS;
    const next = vi.fn();

    requestContext.run({ requestId: 'r2' }, () => {
      usageAnalyticsMiddleware(req, res, next);
      res._emit('finish');
    });

    expect(usageAnalytics.getRecords()[0].category).toBe(UsageCategory.BIS);
  });

  it("uses requestId 'unknown' when requestContext is missing", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn();

    usageAnalyticsMiddleware(req, res, next);
    res._emit('finish');

    const records = usageAnalytics.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].requestId).toBe('unknown');
  });
});
