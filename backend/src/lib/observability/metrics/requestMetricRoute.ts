import type { Request } from 'express';
import { METRICS_SKIP_ROUTE_PREFIXES } from '../../config/constants.js';

/**
 * Express sets `req.route` only after a route matches. Read this on `res.finish`, not when
 * metrics middleware first runs (before routing).
 *
 * When static/middleware handles the request without a matched route (e.g. Swagger assets),
 * `req.baseUrl` is the mount point — use it so all assets under `/v1/docs` group as one path.
 */
export function resolveExpressTemplateRoute(
  req: Pick<Request, 'baseUrl' | 'path' | 'route'>
): string {
  const pattern = req.route?.path;
  if (typeof pattern === 'string' && pattern.length > 0) {
    return `${req.baseUrl}${pattern}`;
  }
  if (req.baseUrl) {
    return req.baseUrl;
  }
  return req.path;
}

/** True when this resolved route should not be written to `request_metrics`. */
export function shouldSkipMetricRoute(route: string): boolean {
  for (const prefix of METRICS_SKIP_ROUTE_PREFIXES) {
    if (route === prefix || route.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}
