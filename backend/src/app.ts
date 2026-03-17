import express from 'express';
import cors from 'cors';
import { container, register, RequestConfigToken, CorsOriginsToken } from './lib/di/container.js';
import type { RequestConfig } from './lib/config/requestConfig.js';

register();

import { requestContextMiddleware } from './middleware/requestContext.js';
import { RequestMetricsMiddleware } from './middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from './middleware/usageAnalytics.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { RequestTimeoutMiddleware } from './middleware/requestTimeout.js';
import { RateLimitMiddleware } from './middleware/rateLimit/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

const requestConfig = container.resolve<RequestConfig>(RequestConfigToken);
const corsOrigins = container.resolve<string[]>(CorsOriginsToken);

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
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

app.use(requestContextMiddleware);
app.use(container.resolve(RequestTimeoutMiddleware).handler);
app.use(container.resolve(RequestMetricsMiddleware).handler);
app.use(container.resolve(UsageAnalyticsMiddleware).handler);
app.use(container.resolve(RateLimitMiddleware).handler);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler());
