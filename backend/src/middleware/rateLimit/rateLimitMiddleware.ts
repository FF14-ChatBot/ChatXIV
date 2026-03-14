import type { Request, Response, NextFunction } from 'express';
import { HEADERS } from '../../lib/config/constants.js';
import type { RateLimitConfig } from './types.js';
import type { RateLimitStore } from './types.js';
import { AppError } from '../../lib/errors/AppError.js';
import { requestContext } from '../../lib/request/requestContext.js';

const RATE_LIMIT_MESSAGE = "You've reached the limit for now; please try again later.";

/** Paths that skip rate limiting (health, docs, admin). */
const SKIP_PATHS = ['/health', '/v1/docs', '/v1/admin'];

function shouldSkipRateLimit(path: string): boolean {
  return SKIP_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

function getRateLimitKey(req: Request): string {
  const sessionId = req.headers[HEADERS.SESSION_ID] as string | undefined;
  if (sessionId) return `session:${sessionId}`;
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  return `ip:${ip}`;
}

export function rateLimitMiddleware(store: RateLimitStore, config: RateLimitConfig) {
  return function middleware(req: Request, res: Response, next: NextFunction): void {
    if (shouldSkipRateLimit(req.path)) {
      next();
      return;
    }
    const key = getRateLimitKey(req);
    const { allowed, retryAfterSeconds } = store.consume(key, config);
    if (!allowed) {
      if (retryAfterSeconds !== undefined) {
        res.setHeader('Retry-After', String(retryAfterSeconds));
      }
      const requestId = requestContext.get()?.requestId;
      next(AppError.rateLimited(RATE_LIMIT_MESSAGE, requestId));
      return;
    }
    next();
  };
}
