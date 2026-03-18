import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { requestContext } from '../lib/request/requestContext.js';
import {
  type UsageStore,
  isUsageCategory,
  UsageCategory,
} from '../lib/observability/usageAnalytics/types.js';
import { UsageStoreToken } from '../lib/di/container.js';

/** Records usage by category on response finish. Must run after requestContextMiddleware so requestId is available. Handlers set res.locals.usageCategory when they know the category. */
@injectable()
export class UsageAnalyticsMiddleware {
  constructor(@inject(UsageStoreToken) private readonly usageStore: UsageStore) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (_req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const raw = res.locals.usageCategory;
      const category = isUsageCategory(raw) ? raw : UsageCategory.UNCATEGORIZED;

      const ctx = requestContext.get();
      const requestId = ctx?.requestId ?? 'unknown';
      this.usageStore.record({ category, requestId, timestamp: Date.now() });
    });

    next();
  };
}
