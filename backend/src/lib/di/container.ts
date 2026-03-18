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
 *   Swap implementations by changing only the `useFactory` in `register()`. Example:
 *   `useFactory: () => createInMemoryMetrics()` → `useFactory: () => createSqliteMetrics()`;
 *   all consumers of that token then get the new implementation without other changes.
 */

import { container as tsyringeContainer, type DependencyContainer } from 'tsyringe';
import { createInMemoryMetrics } from '../observability/metrics/inMemoryMetrics.js';
import { createInMemoryUsageAnalytics } from '../observability/usageAnalytics/inMemoryUsageAnalytics.js';
import {
  type RequestConfig,
  getRequestConfig,
  getRateLimitConfig,
} from '../config/requestConfig.js';
import { getCorsOrigin } from '../config/cors.js';
import { createMemoryStore } from '../../middleware/rateLimit/memoryStore.js';
import type { MetricsStore } from '../observability/metrics/types.js';
import type { UsageStore } from '../observability/usageAnalytics/types.js';
import type { RateLimitConfig, RateLimitStore } from '../../middleware/rateLimit/types.js';
import { setMetrics } from '../observability/metricsInstance.js';
import { setUsageAnalytics } from '../observability/usageAnalyticsInstance.js';

export const MetricsStoreToken = Symbol('MetricsStore');
export const UsageStoreToken = Symbol('UsageStore');
export const RateLimitStoreToken = Symbol('RateLimitStore');
export const RateLimitConfigToken = Symbol('RateLimitConfig');
export const RequestConfigToken = Symbol('RequestConfig');
export const CorsOriginsToken = Symbol('CorsOrigins');

/** The DI container. Call register() once at startup before resolving any dependencies. */
export const container = tsyringeContainer as DependencyContainer;

let registered = false;

/** Call once at app startup (e.g. in server or app entry) to register all tokens and wire globals. */
export function register(): void {
  if (registered) return;
  container.register<MetricsStore>(MetricsStoreToken, {
    useFactory: () => createInMemoryMetrics(),
  });
  container.register<UsageStore>(UsageStoreToken, {
    useFactory: () => createInMemoryUsageAnalytics(),
  });
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
    useFactory: () => getCorsOrigin(),
  });
  setMetrics(container.resolve<MetricsStore>(MetricsStoreToken));
  setUsageAnalytics(container.resolve<UsageStore>(UsageStoreToken));
  registered = true;
}
