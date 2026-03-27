import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors/AppError.js';
import { requestContext } from '../lib/request/requestContext.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function matchesAllowedOrigin(origin: string, allowed: readonly string[]): boolean {
  return allowed.some((o) => o === origin);
}

function matchesAllowedReferer(referer: string, allowed: readonly string[]): boolean {
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return false;
  }
  const base = `${url.protocol}//${url.host}`;
  return allowed.some((o) => base === o || referer.startsWith(`${o}/`));
}

/**
 * Light CSRF mitigation for browser-driven mutating requests: if `Origin` or `Referer`
 * is present, it must match an allowed CORS origin. Missing both allows non-browser clients (curl, workers).
 */
export function createBrowserMutationOriginGuard(
  allowedOrigins: readonly string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!MUTATING.has(req.method)) {
      next();
      return;
    }

    const origin = req.get('Origin');
    const referer = req.get('Referer');

    if (origin) {
      if (!matchesAllowedOrigin(origin, allowedOrigins)) {
        const requestId = requestContext.get()?.requestId;
        next(AppError.forbidden('Origin not allowed for this request', requestId));
        return;
      }
      next();
      return;
    }

    if (referer && !matchesAllowedReferer(referer, allowedOrigins)) {
      const requestId = requestContext.get()?.requestId;
      next(AppError.forbidden('Referer not allowed for this request', requestId));
      return;
    }

    next();
  };
}
