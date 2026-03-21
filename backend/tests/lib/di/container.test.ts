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
  AuthStrategyToken,
  FeatureFlagStoreToken,
  FeatureFlagServiceToken,
} from '@src/lib/di/container.js';
import type { MetricsStore } from '@src/lib/observability/metrics/types.js';
import type { UsageStore } from '@src/lib/observability/usageAnalytics/types.js';
import type { RateLimitConfig, RateLimitStore } from '@src/middleware/rateLimit/types.js';
import type { RequestConfig } from '@src/lib/config/requestConfig.js';
import type { AuthStrategy } from '@src/lib/auth/types.js';
import type { FeatureFlagStore, FeatureFlagService } from '@src/lib/featureFlags/types.js';
import { RequestMetricsMiddleware } from '@src/middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from '@src/middleware/usageAnalytics.js';
import { RateLimitMiddleware } from '@src/middleware/rateLimit/rateLimitMiddleware.js';
import { RequestTimeoutMiddleware } from '@src/middleware/requestTimeout.js';
import { AdminAuthMiddleware } from '@src/middleware/adminAuth.js';

describe('container', () => {
  it('register() registers all tokens and they can be resolved', () => {
    register();

    const metricsStore = container.resolve<MetricsStore>(MetricsStoreToken);
    expect(metricsStore).toBeDefined();
    expect(typeof metricsStore.record).toBe('function');
    expect(typeof metricsStore.getEntries).toBe('function');

    const usageStore = container.resolve<UsageStore>(UsageStoreToken);
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

    const authStrategy = container.resolve<AuthStrategy>(AuthStrategyToken);
    expect(authStrategy).toBeDefined();
    expect(typeof authStrategy.authenticate).toBe('function');

    const featureFlagStore = container.resolve<FeatureFlagStore>(FeatureFlagStoreToken);
    expect(featureFlagStore).toBeDefined();
    expect(typeof featureFlagStore.get).toBe('function');
    expect(typeof featureFlagStore.getAll).toBe('function');
    expect(typeof featureFlagStore.set).toBe('function');
    expect(typeof featureFlagStore.remove).toBe('function');

    const featureFlagService = container.resolve<FeatureFlagService>(FeatureFlagServiceToken);
    expect(featureFlagService).toBeDefined();
    expect(typeof featureFlagService.getAll).toBe('function');
    expect(typeof featureFlagService.setFlag).toBe('function');
    expect(typeof featureFlagService.removeFlag).toBe('function');
    expect(typeof featureFlagService.getEntry).toBe('function');
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

    const adminAuthMw = container.resolve(AdminAuthMiddleware);
    expect(adminAuthMw).toBeDefined();
    expect(typeof adminAuthMw.handler).toBe('function');
  });
});
