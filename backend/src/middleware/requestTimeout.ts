import type { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import type { RequestConfig } from '../lib/config/requestConfig.js';
import { RequestConfigToken } from '../lib/di/container.js';
import { requestContext } from '../lib/request/requestContext.js';
import { AppError } from '../lib/errors/AppError.js';

const DEFAULT_MESSAGE = 'Request took too long; please try again.';

/** DI-injected timeout middleware. Resolve via container.resolve(RequestTimeoutMiddleware).handler. */
@injectable()
export class RequestTimeoutMiddleware {
  constructor(@inject(RequestConfigToken) private readonly config: RequestConfig) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const requestId = requestContext.get()?.requestId;
        next(AppError.requestTimeout(DEFAULT_MESSAGE, requestId));
      }
    }, this.config.requestTimeoutMs);
    res.once('finish', () => clearTimeout(timer));
    next();
  };
}

/** Factory for tests or explicit wiring. Prefer container.resolve(RequestTimeoutMiddleware) in app. */
export function requestTimeoutMiddleware(ms: number) {
  return function timeout(req: Request, res: Response, next: NextFunction): void {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const requestId = requestContext.get()?.requestId;
        next(AppError.requestTimeout(DEFAULT_MESSAGE, requestId));
      }
    }, ms);
    res.once('finish', () => clearTimeout(timer));
    next();
  };
}
