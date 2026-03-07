import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../lib/request/requestContext.js';
import {
  isUsageCategory,
  UsageCategory,
  usageAnalytics,
} from '../lib/observability/usageAnalytics.js';

/** Records usage by category on response finish. Must run after requestContextMiddleware so requestId is available. Handlers set res.locals.usageCategory when they know the category. */
export function usageAnalyticsMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const raw = res.locals.usageCategory;
    const category = isUsageCategory(raw) ? raw : UsageCategory.UNCATEGORIZED;

    const ctx = requestContext.get();
    const requestId = ctx?.requestId ?? 'unknown';
    usageAnalytics.record({ category, requestId, timestamp: Date.now() });
  });

  next();
}
