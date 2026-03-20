/**
 * Error-handling middleware (four-arg: err, req, res, next).
 *
 * Flow:
 * 1. Any route or middleware that throws or calls next(err) is passed here by Express.
 * 2. Async route rejections reach this handler when wrapped with wrapAsync() (otherwise they'd be unhandled).
 * 3. We read requestId from request context, then normalize the error to a status + JSON body (code, message, optional requestId/stack).
 * 4. We log the full error server-side, then send res.status(status).json(body) if headers aren't sent yet.
 * 5. We never call next() — this is the end of the error chain; the request ends and the server keeps running.
 */
import type { Request, Response, NextFunction } from 'express';
import { normalizeError } from '../lib/errors/normalizeError.js';
import { requestContext } from '../lib/request/requestContext.js';
import { logger } from '../lib/observability/logger.js';
import { isProduction } from '../lib/config/env.js';

export interface ErrorHandlerOptions {
  isProduction?: boolean;
}

const isProductionEnv = isProduction();

/** Register last so all route/middleware errors are handled here; does not call next(). */
export function errorHandler(options: ErrorHandlerOptions = {}) {
  const isProduction = options.isProduction ?? isProductionEnv;

  return function handleError(
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
  ): void {
    void next; // Express requires 4-arg signature; we never call next()
    const requestId = requestContext.get()?.requestId;

    if (requestId === undefined) {
      logger.warn({ err }, 'Error handled without requestId (request context missing)');
    }

    const { status, body } = normalizeError(err, {
      requestId,
      includeStack: !isProduction,
      isProduction,
    });

    logger.error({ err, requestId, status, code: body.code }, body.message);

    if (!res.headersSent) {
      res.status(status).json(body);
    }
  };
}
