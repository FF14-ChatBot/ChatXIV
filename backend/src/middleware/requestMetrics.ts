import { Request, Response, NextFunction } from 'express';
import { metrics } from '../lib/observability/metrics.js';

export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const route = req.route?.path ?? req.path;

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    metrics.record({
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
      timestamp: Date.now(),
    });
  });

  next();
}
