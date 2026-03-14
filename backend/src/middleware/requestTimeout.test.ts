import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requestTimeoutMiddleware } from './requestTimeout.js';
import { requestContext } from '../lib/request/requestContext.js';

describe('requestTimeoutMiddleware', () => {
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
