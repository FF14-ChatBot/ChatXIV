import type { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { HEADERS, RESPONSE_HEADERS } from '../../lib/config/constants.js';
import type { RateLimitConfig } from './types.js';
import type { RateLimitStore } from './types.js';
import { RateLimitStoreToken, RateLimitConfigToken } from '../../lib/di/container.js';
import { AppError } from '../../lib/errors/AppError.js';
import { requestContext } from '../../lib/request/requestContext.js';
import { resolveRateLimitConfig, shouldSkipRateLimitPath } from './skipConfig.js';

const RATE_LIMIT_MESSAGE = "You've reached the limit for now; please try again later.";

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
    if (shouldSkipRateLimitPath(req.path)) {
      next();
      return;
    }
    const key = getRateLimitKey(req);
    const effective = resolveRateLimitConfig(req.path, this.config);
    const { allowed, retryAfterSeconds } = this.store.consume(key, effective);
    if (!allowed) {
      if (retryAfterSeconds !== undefined) {
        res.setHeader(RESPONSE_HEADERS.RETRY_AFTER, String(retryAfterSeconds));
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
    if (shouldSkipRateLimitPath(req.path)) {
      next();
      return;
    }
    const key = getRateLimitKey(req);
    const effective = resolveRateLimitConfig(req.path, config);
    const { allowed, retryAfterSeconds } = store.consume(key, effective);
    if (!allowed) {
      if (retryAfterSeconds !== undefined) {
        res.setHeader(RESPONSE_HEADERS.RETRY_AFTER, String(retryAfterSeconds));
      }
      const requestId = requestContext.get()?.requestId;
      next(AppError.rateLimited(RATE_LIMIT_MESSAGE, requestId));
      return;
    }
    next();
  };
}
