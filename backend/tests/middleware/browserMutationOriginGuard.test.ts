import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createBrowserMutationOriginGuard } from '@src/middleware/browserMutationOriginGuard.js';
import { requestContext } from '@src/lib/request/requestContext.js';

const allowed = ['http://localhost:5173', 'https://beta.chatxiv.com'];

function run(guard: ReturnType<typeof createBrowserMutationOriginGuard>, req: Partial<Request>) {
  const next = vi.fn();
  requestContext.run({ requestId: 'rid' }, () =>
    guard(req as Request, {} as Response, next as NextFunction)
  );
  return next;
}

describe('createBrowserMutationOriginGuard', () => {
  const guard = createBrowserMutationOriginGuard(allowed);

  it('allows GET without origin', () => {
    const next = run(guard, { method: 'GET', get: () => undefined });
    expect(next).toHaveBeenCalledWith();
  });

  it('allows POST with matching Origin', () => {
    const next = run(guard, {
      method: 'POST',
      get: (h: string) => (h === 'Origin' ? 'http://localhost:5173' : undefined),
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects POST with foreign Origin', () => {
    const next = run(guard, {
      method: 'POST',
      protocol: 'https',
      get: (h: string) => {
        if (h === 'Origin') return 'https://evil.example';
        if (h === 'host') return 'beta.chatxiv.com';
        return undefined;
      },
    });
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('allows POST when Origin matches this request (Swagger on API host) even if not in CORS list', () => {
    const next = run(guard, {
      method: 'POST',
      protocol: 'https',
      get: (h: string) => {
        if (h === 'Origin') return 'https://dev-api.chatxiv.com';
        if (h === 'host') return 'dev-api.chatxiv.com';
        return undefined;
      },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('allows POST when Origin matches first X-Forwarded-Host (reverse proxy)', () => {
    const next = run(guard, {
      method: 'POST',
      protocol: 'https',
      get: (h: string) => {
        if (h === 'Origin') return 'https://public.example.com';
        if (h === 'host') return 'backend:3000';
        if (h === 'x-forwarded-host') return 'public.example.com';
        return undefined;
      },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('allows POST with no Origin/Referer (non-browser clients)', () => {
    const next = run(guard, {
      method: 'POST',
      get: () => undefined,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects POST when only Referer is set and foreign', () => {
    const next = run(guard, {
      method: 'POST',
      get: (h: string) => (h === 'Referer' ? 'https://evil.example/page' : undefined),
    });
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});
