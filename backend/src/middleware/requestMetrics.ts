import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import type { MetricsStore } from '../lib/observability/metrics/types.js';
import {
  resolveExpressTemplateRoute,
  shouldSkipMetricRoute,
} from '../lib/observability/metrics/requestMetricRoute.js';
import { MetricsStoreToken } from '../lib/di/container.js';

@injectable()
export class RequestMetricsMiddleware {
  constructor(@inject(MetricsStoreToken) private readonly metricsStore: MetricsStore) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    const start = performance.now();

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - start);
      const route = resolveExpressTemplateRoute(req);
      if (shouldSkipMetricRoute(route)) {
        return;
      }
      this.metricsStore.record({
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}
