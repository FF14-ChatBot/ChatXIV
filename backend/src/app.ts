import express from 'express';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { requestMetricsMiddleware } from './middleware/requestMetrics.js';
import { usageAnalyticsMiddleware } from './middleware/usageAnalytics.js';

export const app = express();

app.use(requestContextMiddleware);
app.use(requestMetricsMiddleware);
app.use(usageAnalyticsMiddleware);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
