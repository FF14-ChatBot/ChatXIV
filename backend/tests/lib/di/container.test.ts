import { beforeEach, describe, it, expect, vi } from 'vitest';
import { USAGE_CATEGORIES, type UsageCategory } from '@chatxiv/cdm';
import {
  container,
  register,
  resetDependencyContainerForTests,
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

function emptyUsageCounts(): Record<UsageCategory, number> {
  return Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<UsageCategory, number>;
}

describe('container', () => {
  beforeEach(() => {
    resetDependencyContainerForTests();
  });

  it('register() registers all tokens and they can be resolved', () => {
    const metricsStore: MetricsStore = {
      record: vi.fn(),
      getEntries: vi.fn(() => []),
      getSummary: vi.fn(() => ({
        totalRequests: 0,
        byRoute: {},
        byStatus: {},
      })),
    };
    const usageStore: UsageStore = {
      record: vi.fn(),
      getRecords: vi.fn(() => []),
      getCountByCategory: vi.fn(() => emptyUsageCounts()),
    };

    register({ metricsStore, usageStore });

    expect(container.resolve<MetricsStore>(MetricsStoreToken)).toBe(metricsStore);
    expect(container.resolve<UsageStore>(UsageStoreToken)).toBe(usageStore);

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
    const metricsStore: MetricsStore = {
      record: vi.fn(),
      getEntries: vi.fn(() => []),
      getSummary: vi.fn(() => ({
        totalRequests: 0,
        byRoute: {},
        byStatus: {},
      })),
    };
    const usageStore: UsageStore = {
      record: vi.fn(),
      getRecords: vi.fn(() => []),
      getCountByCategory: vi.fn(() => emptyUsageCounts()),
    };
    register({ metricsStore, usageStore });

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
