import './lib/config/loadDotenv.js';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import { createOptionalUserMiddleware, requireAdminMiddleware } from './middleware/userAuth.js';
import { createPublicRouter } from './routes/v1/public/router.js';
import { createAdminRouter } from './routes/v1/admin/router.js';
import { createAuthRouter } from './routes/v1/auth/router.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getSessionSecret, getBootstrapAdminSubs } from './lib/config/env.js';
import { getOrOpenAppDatabase } from './lib/persistence/sqlite/appDatabaseSingleton.js';
import { createUserDao } from './lib/persistence/sqlite/userDao.js';

export const app = express();

// ── Resolve services ──────────────────────────────────────────────────

const requestConfig = container.resolve<RequestConfig>(RequestConfigToken);
const corsOrigins = container.resolve<string[]>(CorsOriginsToken);
const flagService = container.resolve<FeatureFlagService>(FeatureFlagServiceToken);
const db = getOrOpenAppDatabase();

const bootstrapSubs = getBootstrapAdminSubs();
if (bootstrapSubs.length > 0) {
  createUserDao(db).bootstrapAdmins(bootstrapSubs);
}

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
    ],
    credentials: true,
    maxAge: 86400,
  })
);
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: `${requestConfig.maxBodySizeKb}kb` }));
// @ts-expect-error -- monorepo type duplication: root vs backend @types/express-serve-static-core
app.use(cookieParser(getSessionSecret()));
app.use(requestContextMiddleware);
app.use(createOptionalUserMiddleware(db));
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

// ── Auth routes (/v1/auth) ───────────────────────────────────────────

app.use('/v1/auth', createAuthRouter(db));

// ── Admin routes (/v1/admin) — auth enforced by admin router ─────────

app.use('/v1/admin', createAdminRouter(requireAdminMiddleware, flagService));

// ── Error handler (must be last) ─────────────────────────────────────

app.use(errorHandler());
