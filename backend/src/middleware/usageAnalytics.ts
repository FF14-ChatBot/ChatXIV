import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { requestContext } from '../lib/request/requestContext.js';
import {
  type UsageStore,
  isUsageCategory,
  UsageCategory,
} from '../lib/observability/usageAnalytics/types.js';
import { UsageStoreToken } from '../lib/di/container.js';

/**
 * Records usage by category on response finish when a handler opts in.
 * Must run after requestContextMiddleware so requestId is available.
 *
 * Chat / RAG routes (once implemented) set `res.locals.usageCategory` to a CDM `UsageCategory`.
 * Flags, docs, health, etc. leave it unset — no row is written. `OTHER` / uncategorized is not
 * persisted from middleware so traffic is not inflated before product routes exist.
 */
@injectable()
export class UsageAnalyticsMiddleware {
  constructor(@inject(UsageStoreToken) private readonly usageStore: UsageStore) {}

  /** Express middleware handler. Bound once when registering (e.g. app.use(middleware.handler)). */
  handler = (_req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const raw = res.locals.usageCategory;
      if (raw === undefined || !isUsageCategory(raw) || raw === UsageCategory.UNCATEGORIZED) {
        return;
      }

      const ctx = requestContext.get();
      const requestId = ctx?.requestId ?? 'unknown';
      this.usageStore.record({
        category: raw,
        requestId,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}
