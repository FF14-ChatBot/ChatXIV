import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from './rateLimitMiddleware.js';
import type { RateLimitStore } from './types.js';
import { requestContext } from '../../lib/request/requestContext.js';

describe('rateLimitMiddleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let store: RateLimitStore;

  const reqBag = { path: '/v1/chat', headers: {} as Request['headers'] };

  beforeEach(() => {
    reqBag.path = '/v1/chat';
    reqBag.headers = {};
    req = {
      get path() {
        return reqBag.path;
      },
      set path(v: string) {
        reqBag.path = v;
      },
      get headers() {
        return reqBag.headers;
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    res = { setHeader: vi.fn() } as unknown as Response;
    next = vi.fn();
    store = {
      consume: vi.fn().mockReturnValue({ allowed: true }),
    };
  });

  it('skips rate limit for /health', () => {
    (req as unknown as { path: string }).path = '/health';
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    mw(req, res, next);
    expect(store.consume).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('skips rate limit for /v1/admin and subpaths', () => {
    (req as unknown as { path: string }).path = '/v1/admin/metrics';
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    mw(req, res, next);
    expect(store.consume).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('consumes and calls next() when allowed', () => {
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    requestContext.run({ requestId: 'r1' }, () => {
      mw(req, res, next);
    });
    expect(store.consume).toHaveBeenCalledWith('ip:127.0.0.1', {
      capacity: 10,
      refillPerMin: 2,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('uses session id as key when header present', () => {
    reqBag.headers = { 'x-session-id': 'sess-123' };
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    mw(req, res, next);
    expect(store.consume).toHaveBeenCalledWith('session:sess-123', expect.any(Object));
  });

  it('uses ip:unknown when req.ip and socket.remoteAddress are missing', () => {
    req = {
      get path() {
        return reqBag.path;
      },
      set path(v: string) {
        reqBag.path = v;
      },
      get headers() {
        return reqBag.headers;
      },
      ip: undefined,
      socket: {},
    } as unknown as Request;
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    mw(req, res, next);
    expect(store.consume).toHaveBeenCalledWith('ip:unknown', expect.any(Object));
  });

  it('calls next(err) with 429 and sets Retry-After when not allowed', () => {
    (store.consume as ReturnType<typeof vi.fn>).mockReturnValue({
      allowed: false,
      retryAfterSeconds: 60,
    });
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    requestContext.run({ requestId: 'r2' }, () => {
      mw(req, res, next);
    });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.requestId).toBe('r2');
  });

  it('calls next(err) with 429 without Retry-After when retryAfterSeconds undefined', () => {
    (store.consume as ReturnType<typeof vi.fn>).mockReturnValue({
      allowed: false,
    });
    const mw = rateLimitMiddleware(store, { capacity: 10, refillPerMin: 2 });
    mw(req, res, next);
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(429);
  });
});
