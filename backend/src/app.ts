import express from 'express';
import cors from 'cors';
import { getCorsOrigin } from './lib/config/cors.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { requestMetricsMiddleware } from './middleware/requestMetrics.js';
import { usageAnalyticsMiddleware } from './middleware/usageAnalytics.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
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

// Middlewares that run on every request. (Order matters)
app.use(express.json());
app.use(requestContextMiddleware);
app.use(requestMetricsMiddleware);
app.use(usageAnalyticsMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler());
