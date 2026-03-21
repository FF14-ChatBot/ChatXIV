import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { securityHeadersMiddleware } from '@src/middleware/securityHeaders.js';

describe('securityHeadersMiddleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let setHeader: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setHeader = vi.fn();
    req = { secure: false, get: vi.fn() } as unknown as Request;
    res = { setHeader } as unknown as Response;
    next = vi.fn();
  });

  it('sets X-Content-Type-Options and X-Frame-Options', () => {
    securityHeadersMiddleware(req, res, next);

    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets HSTS when request is over HTTPS (req.secure)', () => {
    req = { secure: true, get: vi.fn() } as unknown as Request;

    securityHeadersMiddleware(req, res, next);

    expect(setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  });

  it('sets HSTS when behind HTTPS proxy (X-Forwarded-Proto)', () => {
    req = {
      secure: false,
      get: vi.fn((h: string) => (h === 'X-Forwarded-Proto' ? 'https' : undefined)),
    } as unknown as Request;

    securityHeadersMiddleware(req, res, next);

    expect(setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  });

  it('does not set HSTS when over HTTP (e.g. local hosting)', () => {
    req = { secure: false, get: vi.fn() } as unknown as Request;

    securityHeadersMiddleware(req, res, next);

    const hstsCalls = setHeader.mock.calls.filter(
      (c: unknown[]) => c[0] === 'Strict-Transport-Security'
    );
    expect(hstsCalls).toHaveLength(0);
  });
});
