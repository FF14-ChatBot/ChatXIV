import type { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { HEADERS } from '../../lib/config/constants.js';
import type { RateLimitConfig } from './types.js';
import type { RateLimitStore } from './types.js';
import { RateLimitStoreToken, RateLimitConfigToken } from '../../lib/di/container.js';
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

/** DI-injected rate limit middleware. Resolve via container.resolve(RateLimitMiddleware).handler. */
@injectable()
export class RateLimitMiddleware {
  constructor(
    @inject(RateLimitStoreToken) private readonly store: RateLimitStore,
    @inject(RateLimitConfigToken) private readonly config: RateLimitConfig
  ) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    if (shouldSkipRateLimit(req.path)) {
      next();
      return;
    }
    const key = getRateLimitKey(req);
    const { allowed, retryAfterSeconds } = this.store.consume(key, this.config);
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

/** Factory for tests or explicit wiring. Prefer container.resolve(RateLimitMiddleware) in app. */
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
