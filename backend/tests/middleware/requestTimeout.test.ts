import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  requestTimeoutMiddleware,
  RequestTimeoutMiddleware,
} from '@src/middleware/requestTimeout.js';
import { requestContext } from '@src/lib/request/requestContext.js';

describe('requestTimeoutMiddleware (factory)', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      headersSent: false,
      once: vi.fn((_event: string, fn: () => void) => {
        (res as unknown as { _onFinish: () => void })._onFinish = fn;
        return res;
      }),
    } as unknown as Response;
    next = vi.fn();
  });

  it('calls next() immediately and clears timer on finish', () => {
    const mw = requestTimeoutMiddleware(10_000);
    requestContext.run({ requestId: 'id-1' }, () => {
      mw(req, res, next);
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    const onFinish = (res as unknown as { _onFinish?: () => void })._onFinish;
    expect(typeof onFinish).toBe('function');
    onFinish?.();
  });

  it('calls next(err) with REQUEST_TIMEOUT AppError when timeout fires', async () => {
    const mw = requestTimeoutMiddleware(10);
    requestContext.run({ requestId: 'req-1' }, () => {
      mw(req, res, next);
    });
    expect(next).toHaveBeenCalledWith();
    await new Promise((r) => setTimeout(r, 25));
    expect(next).toHaveBeenCalledTimes(2);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(408);
    expect(err.code).toBe('REQUEST_TIMEOUT');
    expect(err.requestId).toBe('req-1');
  });

  it('does not call next(err) if response already finished', async () => {
    const mw = requestTimeoutMiddleware(10);
    requestContext.run({ requestId: 'r' }, () => {
      mw(req, res, next);
    });
    (res as { headersSent: boolean }).headersSent = true;
    await new Promise((r) => setTimeout(r, 25));
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('RequestTimeoutMiddleware (injectable class)', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      headersSent: false,
      once: vi.fn((_event: string, fn: () => void) => {
        (res as unknown as { _onFinish: () => void })._onFinish = fn;
        return res;
      }),
    } as unknown as Response;
    next = vi.fn();
  });

  it('calls next() and uses config.requestTimeoutMs for timer', async () => {
    const middleware = new RequestTimeoutMiddleware({
      requestTimeoutMs: 10,
      maxBodySizeKb: 50,
    });
    requestContext.run({ requestId: 'id-1' }, () => {
      middleware.handler(req, res, next);
    });
    expect(next).toHaveBeenCalledWith();
    await new Promise((r) => setTimeout(r, 25));
    expect(next).toHaveBeenCalledTimes(2);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(err?.code).toBe('REQUEST_TIMEOUT');
  });

  it('clears timer on finish', () => {
    const middleware = new RequestTimeoutMiddleware({
      requestTimeoutMs: 100_000,
      maxBodySizeKb: 50,
    });
    requestContext.run({ requestId: 'r' }, () => {
      middleware.handler(req, res, next);
    });
    expect(next).toHaveBeenCalledTimes(1);
    const onFinish = (res as unknown as { _onFinish?: () => void })._onFinish;
    expect(typeof onFinish).toBe('function');
    onFinish?.();
  });

  it('does not call next(err) if response already finished when timeout fires', async () => {
    const middleware = new RequestTimeoutMiddleware({
      requestTimeoutMs: 10,
      maxBodySizeKb: 50,
    });
    requestContext.run({ requestId: 'r' }, () => {
      middleware.handler(req, res, next);
    });
    (res as { headersSent: boolean }).headersSent = true;
    await new Promise((r) => setTimeout(r, 25));
    expect(next).toHaveBeenCalledTimes(1);
  });
});
