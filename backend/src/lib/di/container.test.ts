import { describe, it, expect } from 'vitest';
import {
  container,
  register,
  MetricsStoreToken,
  UsageStoreToken,
  RateLimitStoreToken,
  RateLimitConfigToken,
  RequestConfigToken,
  CorsOriginsToken,
} from './container.js';
import type { IMetricsStore } from '../observability/metrics/index.js';
import type { IUsageStore } from '../observability/usageAnalytics/index.js';
import type { RateLimitConfig, RateLimitStore } from '../../middleware/rateLimit/types.js';
import type { RequestConfig } from '../config/requestConfig.js';
import { RequestMetricsMiddleware } from '../../middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from '../../middleware/usageAnalytics.js';
import { RateLimitMiddleware } from '../../middleware/rateLimit/index.js';
import { RequestTimeoutMiddleware } from '../../middleware/requestTimeout.js';

describe('container', () => {
  it('register() registers all tokens and they can be resolved', () => {
    register();

    const metricsStore = container.resolve<IMetricsStore>(MetricsStoreToken);
    expect(metricsStore).toBeDefined();
    expect(typeof metricsStore.record).toBe('function');
    expect(typeof metricsStore.getEntries).toBe('function');

    const usageStore = container.resolve<IUsageStore>(UsageStoreToken);
    expect(usageStore).toBeDefined();
    expect(typeof usageStore.record).toBe('function');

    const rateLimitStore = container.resolve<RateLimitStore>(RateLimitStoreToken);
    expect(rateLimitStore).toBeDefined();
    expect(typeof rateLimitStore.consume).toBe('function');

    const rateLimitConfig = container.resolve<RateLimitConfig>(RateLimitConfigToken);
    expect(rateLimitConfig).toEqual(
      expect.objectContaining({
        capacity: expect.any(Number),
        refillPerMin: expect.any(Number),
      })
    );

    const requestConfig = container.resolve<RequestConfig>(RequestConfigToken);
    expect(requestConfig).toEqual(
      expect.objectContaining({
        requestTimeoutMs: expect.any(Number),
        maxBodySizeKb: expect.any(Number),
      })
    );

    const corsOrigins = container.resolve<string[]>(CorsOriginsToken);
    expect(Array.isArray(corsOrigins)).toBe(true);
  });

  it('resolve injectable middleware returns instance with handler', () => {
    register();

    const metricsMw = container.resolve(RequestMetricsMiddleware);
    expect(metricsMw).toBeDefined();
    expect(typeof metricsMw.handler).toBe('function');

    const usageMw = container.resolve(UsageAnalyticsMiddleware);
    expect(usageMw).toBeDefined();
    expect(typeof usageMw.handler).toBe('function');

    const rateLimitMw = container.resolve(RateLimitMiddleware);
    expect(rateLimitMw).toBeDefined();
    expect(typeof rateLimitMw.handler).toBe('function');

    const timeoutMw = container.resolve(RequestTimeoutMiddleware);
    expect(timeoutMw).toBeDefined();
    expect(typeof timeoutMw.handler).toBe('function');
  });
});
