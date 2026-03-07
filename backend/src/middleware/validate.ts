import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware that runs validationResult(req). If there are errors,
 * responds with 400 and the error array. Call this after route-specific
 * validators (e.g. body(), query(), param()) so validation is consolidated
 * and routes don't repeat "check result and send 400" logic.
 */
export function validateMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }
  res.status(400).json({
    error: 'Validation failed',
    details: result.array(),
  });
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
