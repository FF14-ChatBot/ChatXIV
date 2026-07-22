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
import {
  createDefaultKnowledgeResolvers,
  createWikiStubResolver,
} from '../knowledge/knowledgePipelineState.js';
import { createXivApiResolver } from '../knowledge/resolvers/xivApiResolver.js';
import { createMediaWikiResolver } from '../knowledge/resolvers/mediaWikiResolver.js';
import { createXivApiClient } from '../xivapi/XIVApiClient.js';
import { createMediaWikiClientFromEnv } from '../mediawiki/client.js';
import { createTokenBucket } from '../http/tokenBucket.js';
import {
  XIVAPI_BASE_URL,
  XIVAPI_RATE_LIMIT_BURST,
  XIVAPI_RATE_LIMIT_PER_SECOND,
  XIVAPI_TIMEOUT_MS,
} from '../config/constants.js';
import { logger } from '../observability/logger.js';
import type { CacheClient } from '../cache/types.js';
import type { SourceResolver } from '../knowledge/types.js';
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
export const SourceResolversToken = Symbol('SourceResolvers');

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

  // TODO: Replace createStubUsageRoutingModel with an LLM JSON classifier that maps to UsageCategory.
  const classificationService = createRoutingClassifier(
    createKeywordClassifier(),
    createStubUsageRoutingModel()
  );
  container.registerInstance<ClassificationService>(
    ClassificationServiceToken,
    classificationService
  );

  container.registerInstance<readonly SourceResolver[]>(
    SourceResolversToken,
    createDefaultKnowledgeResolvers()
  );

  container.register<KnowledgeService>(KnowledgeServiceToken, {
    useFactory: (c) => createKnowledgeService(c.resolve(SourceResolversToken)),
  });

  container.register<ChatService>(ChatServiceToken, {
    useFactory: (c) =>
      createChatService(
        c.resolve(ClassificationServiceToken),
        c.resolve(KnowledgeServiceToken),
        c.resolve(LlmClientToken)
      ),
  });
}

/**
 * After `initializeCache()` registers {@link CacheClientToken}, wire XIVAPI resolver + cache.
 * Must run before the Express app resolves {@link ChatServiceToken}.
 */
export function wireChatKnowledgePipeline(): void {
  if (!container.isRegistered(CacheClientToken)) {
    throw new Error(
      'wireChatKnowledgePipeline() requires initializeCache() to register CacheClientToken first'
    );
  }

  const cache = container.resolve<CacheClient>(CacheClientToken);
  const xivApiClient = createXivApiClient(
    { baseUrl: XIVAPI_BASE_URL, timeoutMs: XIVAPI_TIMEOUT_MS },
    createTokenBucket(XIVAPI_RATE_LIMIT_PER_SECOND, XIVAPI_RATE_LIMIT_BURST, logger),
    logger
  );

  // MediaWikiResolver covers UNLOCKS (ConsoleGamesWiki first, Fandom FFXIV fallback), alongside
  // XivApiResolver which already claims UNLOCKS among its structured-data categories -- both get
  // queried and merged for that category. wikiStubResolver still covers everything neither owns.
  // TODO(DEV-23): Per-category cache keys/TTLs for MediaWiki results (currently uncached).
  const { client: mediaWikiClient, baseUrls: mediaWikiBaseUrls } =
    createMediaWikiClientFromEnv(logger);
  const mediaWikiResolver = createMediaWikiResolver(
    mediaWikiClient,
    mediaWikiBaseUrls,
    [UsageCategory.UNLOCKS],
    logger
  );

  container.registerInstance<readonly SourceResolver[]>(SourceResolversToken, [
    createXivApiResolver({ client: xivApiClient, cache }),
    mediaWikiResolver,
    createWikiStubResolver(),
  ]);
}
