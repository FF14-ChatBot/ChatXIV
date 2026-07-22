import { beforeEach, describe, it, expect } from 'vitest';
import { USAGE_CATEGORIES, UsageCategory } from '@chatxiv/cdm';
import {
  container,
  register,
  wireChatKnowledgePipeline,
  MetricsStoreToken,
  UsageStoreToken,
  RateLimitStoreToken,
  RateLimitConfigToken,
  RequestConfigToken,
  CorsOriginsToken,
  FeatureFlagStoreToken,
  FeatureFlagServiceToken,
  SourceResolversToken,
} from '@src/lib/di/container.js';
import type { SourceResolver } from '@src/lib/knowledge/types.js';
import type { MetricsStore } from '@src/lib/observability/metrics/types.js';
import type { UsageStore } from '@src/lib/observability/usageAnalytics/types.js';
import type { RateLimitConfig, RateLimitStore } from '@src/middleware/rateLimit/types.js';
import type { RequestConfig } from '@src/lib/config/requestConfig.js';
import type { FeatureFlagStore, FeatureFlagService } from '@src/lib/featureFlags/types.js';
import { RequestMetricsMiddleware } from '@src/middleware/requestMetrics.js';
import { UsageAnalyticsMiddleware } from '@src/middleware/usageAnalytics.js';
import { RateLimitMiddleware } from '@src/middleware/rateLimit/rateLimitMiddleware.js';
import { RequestTimeoutMiddleware } from '@src/middleware/requestTimeout.js';
import { resetBackendContainerForTests } from '@test/helpers/resetBackendContainer.js';
import { registerTestCacheClient } from '@test/helpers/registerTestCacheClient.js';

function emptyUsageCounts(): Record<UsageCategory, number> {
  return Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<UsageCategory, number>;
}

describe('container', () => {
  beforeEach(() => {
    resetBackendContainerForTests();
    register();
  });

  it('register() registers all tokens and they can be resolved', () => {
    const metricsStore = container.resolve<MetricsStore>(MetricsStoreToken);
    expect(metricsStore).toBeDefined();
    expect(typeof metricsStore.record).toBe('function');
    expect(typeof metricsStore.getEntries).toBe('function');
    expect(typeof metricsStore.getSummary).toBe('function');

    const usageStore = container.resolve<UsageStore>(UsageStoreToken);
    expect(usageStore).toBeDefined();
    expect(typeof usageStore.record).toBe('function');
    expect(typeof usageStore.getRecords).toBe('function');
    expect(typeof usageStore.getCountByCategory).toBe('function');
    expect(usageStore.getCountByCategory()).toEqual(emptyUsageCounts());

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

    const featureFlagStore = container.resolve<FeatureFlagStore>(FeatureFlagStoreToken);
    expect(featureFlagStore).toBeDefined();
    expect(typeof featureFlagStore.get).toBe('function');
    expect(typeof featureFlagStore.getAll).toBe('function');
    expect(typeof featureFlagStore.set).toBe('function');
    expect(typeof featureFlagStore.remove).toBe('function');

    const featureFlagService = container.resolve<FeatureFlagService>(FeatureFlagServiceToken);
    expect(featureFlagService).toBeDefined();
    expect(typeof featureFlagService.list).toBe('function');
    expect(typeof featureFlagService.setFlag).toBe('function');
    expect(typeof featureFlagService.removeFlag).toBe('function');
    expect(typeof featureFlagService.getEntry).toBe('function');
  });

  it('resolve injectable middleware returns instance with handler', () => {
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

  it('wireChatKnowledgePipeline throws when cache is not initialized', () => {
    expect(() => wireChatKnowledgePipeline()).toThrow(/initializeCache/i);
  });

  it('wireChatKnowledgePipeline registers XIVAPI and wiki stub resolvers', () => {
    registerTestCacheClient();
    wireChatKnowledgePipeline();
    const resolvers = container.resolve<readonly SourceResolver[]>(SourceResolversToken);
    expect(resolvers).toHaveLength(2);
    expect(resolvers[0]?.supportedCategories).toContain(UsageCategory.ITEMS);
    expect(resolvers[1]?.supportedCategories).not.toContain(UsageCategory.ITEMS);
  });
});
