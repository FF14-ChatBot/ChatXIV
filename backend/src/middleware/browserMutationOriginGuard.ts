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
 * Browser-visible origin for this request. Prefer `Host` + `req.protocol` (Express uses
 * `trust proxy` + `X-Forwarded-Proto`). If `X-Forwarded-Host` is set (common behind reverse
 * proxies), use its first hop so `Origin` from the public URL still matches.
 */
function getRequestPublicOrigin(req: Request): string | undefined {
  const forwardedHost = req.get('x-forwarded-host');
  const host =
    forwardedHost && forwardedHost.trim() !== ''
      ? forwardedHost.split(',')[0]?.trim()
      : req.get('host');
  if (!host || host.trim() === '') return undefined;
  const proto = req.protocol;
  if (!proto || proto.trim() === '') return undefined;
  return `${proto}://${host}`;
}

function originMatchesThisRequest(req: Request, origin: string): boolean {
  const selfOrigin = getRequestPublicOrigin(req);
  return selfOrigin !== undefined && selfOrigin === origin;
}

function refererOriginMatchesThisRequest(req: Request, referer: string): boolean {
  try {
    const url = new URL(referer);
    return originMatchesThisRequest(req, url.origin);
  } catch {
    return false;
  }
}

/**
 * Light CSRF mitigation for browser-driven mutating requests: if `Origin` or `Referer`
 * is present, it must match an allowed CORS origin **or** this server's public origin (e.g.
 * Swagger UI on the API host). That still applies when `CORS_ORIGIN` replaces defaults and
 * omits the API URL. Missing both allows non-browser clients (curl, workers).
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
      if (!originMatchesThisRequest(req, origin) && !matchesAllowedOrigin(origin, allowedOrigins)) {
        const requestId = requestContext.get()?.requestId;
        next(AppError.forbidden('Origin not allowed for this request', requestId));
        return;
      }
      next();
      return;
    }

    if (
      referer &&
      !refererOriginMatchesThisRequest(req, referer) &&
      !matchesAllowedReferer(referer, allowedOrigins)
    ) {
      const requestId = requestContext.get()?.requestId;
      next(AppError.forbidden('Referer not allowed for this request', requestId));
      return;
    }

    next();
  };
}
