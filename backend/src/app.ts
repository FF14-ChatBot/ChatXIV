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
  FeedbackServiceToken,
} from './lib/di/container.js';
import type { RequestConfig } from './lib/config/requestConfig.js';
import type { FeatureFlagService } from './lib/featureFlags/types.js';
import type { FeedbackService } from './lib/feedback/types.js';

register();

import { requestContextMiddleware } from './middleware/requestContext.js';
import { RequestMetricsMiddleware } from './middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from './middleware/usageAnalytics.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { RequestTimeoutMiddleware } from './middleware/requestTimeout.js';
import { RateLimitMiddleware } from './middleware/rateLimit/rateLimitMiddleware.js';
import { createBrowserMutationOriginGuard } from './middleware/browserMutationOriginGuard.js';
import { createOptionalUserMiddleware, requireAdminMiddleware } from './middleware/userAuth.js';
import { createPublicRouter } from './routes/v1/public/router.js';
import { createAdminRouter } from './routes/v1/admin/router.js';
import { createAuthRouter } from './routes/v1/auth/router.js';
import { errorHandler } from './middleware/errorHandler.js';
import { HTTP_HEADER_NAMES, HTTP_METHOD } from '@chatxiv/cdm';
import { getSessionSecret, getBootstrapAdminSubs } from './lib/config/env.js';
import { getOrOpenAppDatabase } from './lib/persistence/sqlite/appDatabaseSingleton.js';
import { createUserDao } from './lib/persistence/sqlite/userDao.js';

export const app = express();

/** One reverse-proxy hop (e.g. Traefik) so `req.ip` and `X-Forwarded-*` reflect the client. */
app.set('trust proxy', 1);

// ── Resolve services ──────────────────────────────────────────────────

const requestConfig = container.resolve<RequestConfig>(RequestConfigToken);
const corsOrigins = container.resolve<string[]>(CorsOriginsToken);
const flagService = container.resolve<FeatureFlagService>(FeatureFlagServiceToken);
const feedbackService = container.resolve<FeedbackService>(FeedbackServiceToken);
const db = getOrOpenAppDatabase();

const bootstrapSubs = getBootstrapAdminSubs();
if (bootstrapSubs.length > 0) {
  createUserDao(db).bootstrapAdmins(bootstrapSubs);
}

// ── Global middleware ─────────────────────────────────────────────────

app.use(
  cors({
    origin: corsOrigins,
    methods: [
      HTTP_METHOD.GET,
      HTTP_METHOD.POST,
      HTTP_METHOD.PUT,
      HTTP_METHOD.DELETE,
      HTTP_METHOD.OPTIONS,
    ],
    allowedHeaders: [
      HTTP_HEADER_NAMES.CONTENT_TYPE,
      HTTP_HEADER_NAMES.AUTHORIZATION,
      HTTP_HEADER_NAMES.IDEMPOTENCY_KEY,
      HTTP_HEADER_NAMES.X_SESSION_ID,
      HTTP_HEADER_NAMES.X_REQUEST_ID,
      HTTP_HEADER_NAMES.CF_TURNSTILE_RESPONSE,
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
app.use(createBrowserMutationOriginGuard(corsOrigins));
app.use(container.resolve(RequestTimeoutMiddleware).handler);
app.use(container.resolve(RequestMetricsMiddleware).handler);
app.use(container.resolve(UsageAnalyticsMiddleware).handler);
app.use(container.resolve(RateLimitMiddleware).handler);

// ── Health ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Public routes (/v1) ──────────────────────────────────────────────

app.use('/v1', createPublicRouter(flagService, feedbackService));

// ── Auth routes (/v1/auth) ───────────────────────────────────────────

app.use('/v1/auth', createAuthRouter(db));

// ── Admin routes (/v1/admin) — auth enforced by admin router ─────────

app.use('/v1/admin', createAdminRouter(requireAdminMiddleware, flagService, feedbackService));

// ── Error handler (must be last) ─────────────────────────────────────

app.use(errorHandler());
