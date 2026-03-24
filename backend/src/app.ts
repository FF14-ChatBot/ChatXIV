import './lib/config/loadDotenv.js';

import express from 'express';
import cors from 'cors';
import {
  container,
  register,
  RequestConfigToken,
  CorsOriginsToken,
  FeatureFlagServiceToken,
} from './lib/di/container.js';
import type { RequestConfig } from './lib/config/requestConfig.js';
import type { FeatureFlagService } from './lib/featureFlags/types.js';

register();

import { requestContextMiddleware } from './middleware/requestContext.js';
import { RequestMetricsMiddleware } from './middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from './middleware/usageAnalytics.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { RequestTimeoutMiddleware } from './middleware/requestTimeout.js';
import { RateLimitMiddleware } from './middleware/rateLimit/rateLimitMiddleware.js';
import { AdminAuthMiddleware } from './middleware/adminAuth.js';
import { createPublicRouter } from './routes/v1/public/router.js';
import { createAdminRouter } from './routes/v1/admin/router.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// ── Resolve services ──────────────────────────────────────────────────

const requestConfig = container.resolve<RequestConfig>(RequestConfigToken);
const corsOrigins = container.resolve<string[]>(CorsOriginsToken);
const flagService = container.resolve<FeatureFlagService>(FeatureFlagServiceToken);
const adminAuth = container.resolve(AdminAuthMiddleware);

// ── Global middleware ─────────────────────────────────────────────────

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Session-Id',
      'X-Request-Id',
      'X-Admin-Key',
    ],
    credentials: true,
    maxAge: 86400,
  })
);
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: `${requestConfig.maxBodySizeKb}kb` }));
app.use(requestContextMiddleware);
app.use(container.resolve(RequestTimeoutMiddleware).handler);
app.use(container.resolve(RequestMetricsMiddleware).handler);
app.use(container.resolve(UsageAnalyticsMiddleware).handler);
app.use(container.resolve(RateLimitMiddleware).handler);

// ── Health ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Public routes (/v1) ──────────────────────────────────────────────

app.use('/v1', createPublicRouter(flagService));

// ── Admin routes (/v1/admin) — auth enforced by admin router ─────────

app.use('/v1/admin', createAdminRouter(adminAuth, flagService));

// ── Error handler (must be last) ─────────────────────────────────────

app.use(errorHandler());
