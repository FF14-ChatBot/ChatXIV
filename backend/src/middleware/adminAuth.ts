import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import type { AuthStrategy } from '../lib/auth/types.js';
import { AuthStrategyToken } from '../lib/di/container.js';
import { AppError } from '../lib/errors/AppError.js';
import { requestContext } from '../lib/request/requestContext.js';

@injectable()
export class AdminAuthMiddleware {
  constructor(@inject(AuthStrategyToken) private readonly strategy: AuthStrategy) {}

  handler = (req: Request, _res: Response, next: NextFunction): void => {
    const requestId = requestContext.get()?.requestId;

    this.strategy
      .authenticate(req)
      .then((result) => {
        if (!result.authenticated) {
          next(AppError.unauthorized('Valid admin credentials required', requestId));
          return;
        }
        next();
      })
      .catch(next);
  };
}
