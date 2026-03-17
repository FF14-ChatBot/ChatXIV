import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import type { IMetricsStore } from '../lib/observability/metrics/index.js';
import { MetricsStoreToken } from '../lib/di/container.js';

@injectable()
export class RequestMetricsMiddleware {
  constructor(@inject(MetricsStoreToken) private readonly metricsStore: IMetricsStore) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    const start = performance.now();
    const route = req.route?.path ?? req.path;

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - start);
      this.metricsStore.record({
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationMs,
        timestamp: Date.now(),
      });
    });

    next();
  };
}
