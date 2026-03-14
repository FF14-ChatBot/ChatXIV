import type { Request, Response, NextFunction } from 'express';
import { requestContext } from '../lib/request/requestContext.js';
import { AppError } from '../lib/errors/AppError.js';

const DEFAULT_MESSAGE = 'Request took too long; please try again.';

/**
 * Returns middleware that responds with 408 (REQUEST_TIMEOUT) if the request
 * is not finished within `ms` milliseconds. Clears the timer when the response finishes.
 */
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
