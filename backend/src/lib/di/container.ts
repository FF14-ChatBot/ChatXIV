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
 * Tests reset the container via `container.reset()` (see `tests/helpers/resetBackendContainer.ts`);
 * do not add test-only parameters to `register()`.
 */

import { container as tsyringeContainer, type DependencyContainer } from 'tsyringe';
import {
  type RequestConfig,
  getRequestConfig,
  getRateLimitConfig,
} from '../config/requestConfig.js';
import { getCorsOrigins } from '../config/cors.js';
import { createMemoryStore } from '../../middleware/rateLimit/memoryStore.js';
import { createFeatureFlagService } from '../featureFlags/featureFlagService.js';
import type { MetricsStore } from '../observability/metrics/types.js';
import type { UsageStore } from '../observability/usageAnalytics/types.js';
import type { RateLimitConfig, RateLimitStore } from '../../middleware/rateLimit/types.js';
import type { FeatureFlagStore, FeatureFlagService } from '../featureFlags/types.js';
import { createSqliteFeatureFlagStore } from '../featureFlags/sqliteFeatureFlagStore.js';
import { setMetrics } from '../observability/metricsInstance.js';
import { setUsageAnalytics } from '../observability/usageAnalyticsInstance.js';
import { setFeatureFlagService } from '../featureFlags/featureFlagInstance.js';
import { getOrOpenAppDatabase } from '../persistence/sqlite/appDatabaseSingleton.js';
import { createSqliteMetricsStore } from '../persistence/sqlite/sqliteMetricsStore.js';
import { createSqliteUsageStore } from '../persistence/sqlite/sqliteUsageStore.js';
import { FeedbackSubmissionsDao } from '../persistence/sqlite/dao/FeedbackSubmissionsDao.js';
import { createFeedbackService } from '../feedback/feedbackService.js';
import type { FeedbackService } from '../feedback/types.js';
import type { ClassificationService } from '../classification/types.js';
import type { KnowledgeService } from '../knowledge/types.js';
import type { ChatService } from '../chat/types.js';
import type { LlmClient, LlmFormatResult } from '../llm/types.js';
import { createKeywordClassifier } from '../classification/keywordClassifier.js';
import { createRoutingClassifier } from '../classification/routingClassifier.js';
import { createStubUsageRoutingModel } from '../classification/stubUsageRoutingModel.js';
import { createKnowledgeService } from '../knowledge/knowledgeService.js';
import { createChatService } from '../chat/chatService.js';
import { createStubResolver } from '../knowledge/resolvers/stubResolver.js';
import { UsageCategory } from '@chatxiv/cdm';

export const MetricsStoreToken = Symbol('MetricsStore');
export const UsageStoreToken = Symbol('UsageStore');
export const RateLimitStoreToken = Symbol('RateLimitStore');
export const RateLimitConfigToken = Symbol('RateLimitConfig');
export const RequestConfigToken = Symbol('RequestConfig');
export const CorsOriginsToken = Symbol('CorsOrigins');
export const FeatureFlagStoreToken = Symbol('FeatureFlagStore');
export const FeatureFlagServiceToken = Symbol('FeatureFlagService');
export const FeedbackServiceToken = Symbol('FeedbackService');
export const ClassificationServiceToken = Symbol('ClassificationService');
export const KnowledgeServiceToken = Symbol('KnowledgeService');
export const ChatServiceToken = Symbol('ChatService');
export const LlmClientToken = Symbol('LlmClient');
export const CacheClientToken = Symbol('CacheClient');

/** The DI container. Call register() once at startup before resolving any dependencies. */
export const container = tsyringeContainer as DependencyContainer;

/** Call once at app startup (e.g. in server or app entry) to register all tokens and wire globals. */
export function register(): void {
  if (container.isRegistered(MetricsStoreToken)) {
    return;
  }

  const db = getOrOpenAppDatabase();
  const metricsStore = createSqliteMetricsStore(db);
  const usageStore = createSqliteUsageStore(db);

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
  const flagStore = createSqliteFeatureFlagStore(db);
  container.registerInstance<FeatureFlagStore>(FeatureFlagStoreToken, flagStore);
  const flagService = createFeatureFlagService(flagStore);
  container.registerInstance<FeatureFlagService>(FeatureFlagServiceToken, flagService);
  const feedbackDao = new FeedbackSubmissionsDao(db);
  const feedbackService = createFeedbackService(feedbackDao);
  container.registerInstance<FeedbackService>(FeedbackServiceToken, feedbackService);

  setMetrics(container.resolve<MetricsStore>(MetricsStoreToken));
  setUsageAnalytics(container.resolve<UsageStore>(UsageStoreToken));
  setFeatureFlagService(flagService);

  // ── Chat pipeline ────────────────────────────────────────────────────
  // CacheClientToken is registered by `initializeCache()` at server startup.
  // Tests register a mock via `createMockCacheClient()` (see tests/mocks/cacheClient.mock.ts).

  // TODO: Replace with real AnthropicClient once lib/clients/anthropic/ is implemented.
  const stubLlmClient: LlmClient = {
    async *formatWithCitationsStream(): AsyncIterable<string> {
      yield 'Chat is not yet available. The LLM client has not been configured.';
    },
    async formatWithCitations(): Promise<LlmFormatResult> {
      return {
        content: 'Chat is not yet available.',
        sources: [],
        inputTokens: 0,
        outputTokens: 0,
      };
    },
  };
  container.registerInstance<LlmClient>(LlmClientToken, stubLlmClient);

  // TODO: Replace stub resolver with real SourceResolver implementations
  //       (XivApiResolver, MediaWikiResolver, CuratedDataResolver) once
  //       lib/clients/xivapi/ and lib/clients/mediawiki/ are implemented.
  //       Register each resolver and pass the array to createKnowledgeService.
  const stubResolver = createStubResolver(Object.values(UsageCategory) as UsageCategory[]);
  const knowledgeService = createKnowledgeService([stubResolver]);
  container.registerInstance<KnowledgeService>(KnowledgeServiceToken, knowledgeService);

  // TODO: Replace createStubUsageRoutingModel with an LLM JSON classifier that maps to UsageCategory.
  const classificationService = createRoutingClassifier(
    createKeywordClassifier(),
    createStubUsageRoutingModel()
  );
  container.registerInstance<ClassificationService>(
    ClassificationServiceToken,
    classificationService
  );

  const chatService = createChatService(classificationService, knowledgeService, stubLlmClient);
  container.registerInstance<ChatService>(ChatServiceToken, chatService);
}
