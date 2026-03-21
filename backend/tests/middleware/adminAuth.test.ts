import { describe, it, expect, vi, type Mocked } from 'vitest';
import type { Request, Response } from 'express';
import { AdminAuthMiddleware } from '@src/middleware/adminAuth.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { createMockAuthStrategy } from '@test/mocks/authStrategy.mock.js';
import type { AuthStrategy } from '@src/lib/auth/types.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

function createReqRes() {
  const req = { headers: {} } as unknown as Request;
  const res = {} as unknown as Response;
  return { req, res };
}

describe('middleware/adminAuth', () => {
  it('calls next() when strategy authenticates', async () => {
    const strategy = createMockAuthStrategy(true);
    const middleware = new AdminAuthMiddleware(strategy);
    const { req, res } = createReqRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError) when strategy rejects', async () => {
    const strategy = createMockAuthStrategy(false);
    const middleware = new AdminAuthMiddleware(strategy);
    const { req, res } = createReqRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.requestId).toBe('test-req-id');
  });

  it('calls next(err) when strategy throws', async () => {
    const strategy: Mocked<AuthStrategy> = createMockAuthStrategy();
    strategy.authenticate.mockRejectedValue(new Error('boom'));
    const middleware = new AdminAuthMiddleware(strategy);
    const { req, res } = createReqRes();
    const next = vi.fn();

    middleware.handler(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    const err = next.mock.calls[0][0] as Error;
    expect(err.message).toBe('boom');
  });
});
