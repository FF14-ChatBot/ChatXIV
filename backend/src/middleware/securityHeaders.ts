import { Request, Response, NextFunction } from 'express';
import {
  INCOMING_HEADERS,
  RESPONSE_HEADERS,
  SECURITY_HEADER_VALUES,
} from '../lib/config/constants.js';

/** True when the request was delivered over HTTPS (direct or via proxy). */
function isSecure(req: Request): boolean {
  return req.secure || req.get(INCOMING_HEADERS.X_FORWARDED_PROTO) === 'https';
}

/**
 * Sets security headers on every response. HSTS only when actually over HTTPS
 * (so hosting the server locally over HTTP never gets HSTS).
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(
    RESPONSE_HEADERS.X_CONTENT_TYPE_OPTIONS,
    SECURITY_HEADER_VALUES.X_CONTENT_TYPE_OPTIONS
  );
  res.setHeader(RESPONSE_HEADERS.X_FRAME_OPTIONS, SECURITY_HEADER_VALUES.X_FRAME_OPTIONS);
  if (isSecure(req)) {
    res.setHeader(
      RESPONSE_HEADERS.STRICT_TRANSPORT_SECURITY,
      SECURITY_HEADER_VALUES.STRICT_TRANSPORT_SECURITY
    );
  }
  next();
}
