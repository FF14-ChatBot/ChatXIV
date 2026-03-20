/**
 * Composition root: the single DI container for the backend (TSyringe).
 * Dependencies depend on interfaces/tokens (DIP); concrete implementations are wired only here.
 *
 * ## How to use
 * 1. At app startup, call `register()` once (e.g. in your server or app entry).
 * 2. Resolve with `container.resolve(SomeClass)` or `container.resolve(SomeToken)`.
 *    - **Classes** marked `@injectable()` are resolved by constructor; no registration needed.
 *    - **Tokens** (Symbols below) must be registered in `register()`; classes use `@inject(Token)`.
 * 3. setMetrics/setUsageAnalytics in register() wire the same store instance for code that can't
 *    use DI (e.g. admin routes that read metrics). Those call getMetrics()/getUsageAnalytics().
 * 4. Env-derived config (request timeout, body size, CORS, rate limit) is also registered as tokens
 *    here so the app and middleware get config from the container; env is read only in config modules.
 *
 * ## How to add new injections
 * - **New injectable class** (service, middleware, client): add `@injectable()` and
 *   `@inject(SomeToken)` in the constructor. Resolve with `container.resolve(YourClass)`.
 *   Only make a class injectable if it has swappable dependencies; pure functions are fine as-is.
 * - **New token** (logger, HTTP client, config): (1) export a token, e.g. `export const LoggerToken = Symbol('Logger');`
 *   (2) in `register()`, add `container.register<Type>(Token, { useFactory: () => ... })`
 *   (3) in the class, add `@inject(Token)` in the constructor.
 *   Swap implementations by changing only the `useFactory` in `register()`.
 *
 * Observability (metrics + usage) always uses SQLite in production wiring; tests may pass
 * `register({ metricsStore, usageStore })` to inject mocks without opening a database.
 */

import { container as tsyringeContainer, type DependencyContainer } from 'tsyringe';
import {
  type RequestConfig,
  getRequestConfig,
  getRateLimitConfig,
} from '../config/requestConfig.js';
import { getCorsOrigins } from '../config/cors.js';
import { getAdminApiKey } from '../config/env.js';
import { createMemoryStore } from '../../middleware/rateLimit/memoryStore.js';
import { createApiKeyAuthStrategy } from '../auth/apiKeyAuthStrategy.js';
import { createInMemoryFeatureFlagStore } from '../featureFlags/inMemoryFeatureFlagStore.js';
import { createFeatureFlagService } from '../featureFlags/featureFlagService.js';
import type { MetricsStore } from '../observability/metrics/types.js';
import type { UsageStore } from '../observability/usageAnalytics/types.js';
import type { RateLimitConfig, RateLimitStore } from '../../middleware/rateLimit/types.js';
import type { AuthStrategy } from '../auth/types.js';
import type { FeatureFlagStore, FeatureFlagService } from '../featureFlags/types.js';
import {
  setMetrics,
  resetMetricsStoreSingletonForTests,
} from '../observability/metricsInstance.js';
import {
  setUsageAnalytics,
  resetUsageAnalyticsSingletonForTests,
} from '../observability/usageAnalyticsInstance.js';
import {
  setFeatureFlagService,
  resetFeatureFlagServiceSingletonForTests,
} from '../featureFlags/featureFlagInstance.js';
import {
  getOrOpenObservabilityDatabase,
  closeObservabilityDatabase,
} from '../persistence/sqlite/observabilityDatabaseSingleton.js';
import { createSqliteMetricsStore } from '../persistence/sqlite/sqliteMetricsStore.js';
import { createSqliteUsageStore } from '../persistence/sqlite/sqliteUsageStore.js';

export const MetricsStoreToken = Symbol('MetricsStore');
export const UsageStoreToken = Symbol('UsageStore');
export const RateLimitStoreToken = Symbol('RateLimitStore');
export const RateLimitConfigToken = Symbol('RateLimitConfig');
export const RequestConfigToken = Symbol('RequestConfig');
export const CorsOriginsToken = Symbol('CorsOrigins');
export const AuthStrategyToken = Symbol('AuthStrategy');
export const FeatureFlagStoreToken = Symbol('FeatureFlagStore');
export const FeatureFlagServiceToken = Symbol('FeatureFlagService');

/** The DI container. Call register() once at startup before resolving any dependencies. */
export const container = tsyringeContainer as DependencyContainer;

let registered = false;

/** Optional SQLite bypass for Vitest (inject mocks without opening a DB). */
export type RegisterTestOverrides = {
  metricsStore: MetricsStore;
  usageStore: UsageStore;
};

/** Call once at app startup (e.g. in server or app entry) to register all tokens and wire globals. */
export function register(overrides?: RegisterTestOverrides): void {
  if (registered) return;

  let metricsStore: MetricsStore;
  let usageStore: UsageStore;
  if (overrides !== undefined) {
    metricsStore = overrides.metricsStore;
    usageStore = overrides.usageStore;
  } else {
    const db = getOrOpenObservabilityDatabase();
    metricsStore = createSqliteMetricsStore(db);
    usageStore = createSqliteUsageStore(db);
  }

  container.registerInstance<MetricsStore>(MetricsStoreToken, metricsStore);
  container.registerInstance<UsageStore>(UsageStoreToken, usageStore);
  container.register<RateLimitStore>(RateLimitStoreToken, {
    useFactory: () => createMemoryStore(),
  });
  container.register<RateLimitConfig>(RateLimitConfigToken, {
    useFactory: () => getRateLimitConfig(),
  });
  container.register<RequestConfig>(RequestConfigToken, {
    useFactory: () => getRequestConfig(),
  });
  container.register<string[]>(CorsOriginsToken, {
    useFactory: () => getCorsOrigins(),
  });
  container.register<AuthStrategy>(AuthStrategyToken, {
    useFactory: () => createApiKeyAuthStrategy(() => getAdminApiKey() ?? ''),
  });
  const flagStore = createInMemoryFeatureFlagStore();
  container.registerInstance<FeatureFlagStore>(FeatureFlagStoreToken, flagStore);
  const flagService = createFeatureFlagService(flagStore);
  container.registerInstance<FeatureFlagService>(FeatureFlagServiceToken, flagService);
  setMetrics(container.resolve<MetricsStore>(MetricsStoreToken));
  setUsageAnalytics(container.resolve<UsageStore>(UsageStoreToken));
  setFeatureFlagService(flagService);
  registered = true;
}

/**
 * @internal Vitest — clears TSyringe state, closes observability DB, and resets globals so `register()` runs again.
 */
export function resetDependencyContainerForTests(): void {
  registered = false;
  container.reset();
  closeObservabilityDatabase();
  resetMetricsStoreSingletonForTests();
  resetUsageAnalyticsSingletonForTests();
  resetFeatureFlagServiceSingletonForTests();
}
