import express from 'express';
import cors from 'cors';
import { getCorsOrigin } from './lib/config/cors.js';
import {
  getMaxBodySizeKb,
  getRequestTimeoutMs,
  getRateLimitConfig,
} from './lib/config/requestConfig.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { requestMetricsMiddleware } from './middleware/requestMetrics.js';
import { usageAnalyticsMiddleware } from './middleware/usageAnalytics.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { requestTimeoutMiddleware } from './middleware/requestTimeout.js';
import { createMemoryStore, rateLimitMiddleware } from './middleware/rateLimit/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  cors({
    origin: getCorsOrigin(),
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

const bodyLimitKb = getMaxBodySizeKb();
app.use(express.json({ limit: `${bodyLimitKb}kb` }));

app.use(requestContextMiddleware);
app.use(requestTimeoutMiddleware(getRequestTimeoutMs()));
app.use(requestMetricsMiddleware);
app.use(usageAnalyticsMiddleware);
app.use(rateLimitMiddleware(createMemoryStore(), getRateLimitConfig()));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler());
