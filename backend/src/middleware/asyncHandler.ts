import type { Request, Response, NextFunction } from 'express';

/** Wraps async route handlers so rejections become next(err) and reach error middleware. */
export function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
