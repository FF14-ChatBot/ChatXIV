import { Request, Response, NextFunction } from 'express';

/** True when the request was delivered over HTTPS (direct or via proxy). */
function isSecure(req: Request): boolean {
  return req.secure || req.get('X-Forwarded-Proto') === 'https';
}

/**
 * Sets security headers on every response. HSTS only when actually over HTTPS
 * (so hosting the server locally over HTTP never gets HSTS).
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (isSecure(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
