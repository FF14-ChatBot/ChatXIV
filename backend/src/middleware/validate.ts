import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from '../lib/errors/AppError.js';
import { requestContext } from '../lib/request/requestContext.js';

/**
 * Middleware that runs validationResult(req). If there are errors,
 * calls next(AppError.validation(...)) so the global error handler
 * returns 400 with CDM shape (code: VALIDATION_ERROR, message, requestId).
 */
export function validateMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }
  const errors = result.array();
  const first = errors[0];
  const message =
    first && 'path' in first && first.path
      ? `${String(first.path)}: ${first.msg}`
      : ((first?.msg as string) ?? 'Validation failed');
  const requestId = requestContext.get()?.requestId;
  next(AppError.validation(message, requestId));
}

/**
 * Runs the given validation chains and then validateMiddleware.
 *
 * @example
 * app.post('/api/example', validate([
 *   body('email').isEmail().normalizeEmail(),
 *   body('name').trim().notEmpty(),
 * ]), (req, res) => { ... });
 */
export function validate(validations: ValidationChain[]) {
  return [...validations, validateMiddleware];
}
