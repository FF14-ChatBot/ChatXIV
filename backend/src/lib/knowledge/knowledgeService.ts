import { ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { logger } from '../observability/logger.js';
import { AppError } from '../errors/AppError.js';
import type {
  KnowledgeService,
  ResolveOptions,
  RetrievalResult,
  RetrieveOptions,
  SourceResolver,
  RetrievedChunk,
} from './types.js';

const DEFAULT_TOP_K = 8;
/**
 * Each resolver invoked for a query gets its own independent budget of this length (see
 * `executeWithTimeout` -- one `AbortController` per resolver, not one shared across all of
 * them). MediaWiki's per-wiki rate limiter (see `mediawiki/rateLimit.ts`) can itself add
 * multiple seconds of queueing on a cold token bucket before a resolver's first fetch even
 * starts, and `mediaWikiResolver.ts`'s ConsoleGamesWiki -> Fandom fallback attempts two wikis
 * sequentially -- confirmed live that this can exceed a 6s budget from rate-limit queueing
 * alone, not slow responses (DEV-59). Per-resolver isolation means a slow/queued source no
 * longer also aborts a healthy one running in parallel that would have finished on its own --
 * the previous shared-controller design meant one resolver's timeout took every resolver down
 * with it, even ones with nothing to do with the delay. `chatService.ts`'s own
 * `PIPELINE_TIMEOUT_MS` (30s) and the Anthropic call's default timeout (12s) leave ample room
 * for this per-resolver budget without risking the overall request budget, since resolvers run
 * concurrently -- the worst case is still bounded by the single slowest one, not their sum.
 */
const RETRIEVAL_TIMEOUT_MS = 10_000;

/**
 * Registry-based knowledge service. Routes queries to the appropriate
 * SourceResolver(s) based on the classified category.
 *
 * When category is UNCATEGORIZED or confidence is low, queries all
 * resolvers in parallel and merges results by score. This is a coarse,
 * "ask everyone" fallback for when routing itself is uncertain -- it does
 * not mean every resolver should treat every such query as relevant to it.
 * `ResolveOptions.category` carries the actual category through so a
 * resolver invoked only via this fallback can decline (return `[]`) rather
 * than doing real work (e.g. outbound API calls) for a query it has no
 * reason to believe is actually about one of its `supportedCategories`.
 */
export function createKnowledgeService(resolvers: readonly SourceResolver[]): KnowledgeService {
  const categoryMap = buildCategoryMap(resolvers);

  return {
    async retrieve(query: string, options?: RetrieveOptions): Promise<RetrievalResult> {
      const topK = options?.topK ?? DEFAULT_TOP_K;
      const category = options?.category;

      const targetResolvers = pickResolvers(category, categoryMap, resolvers);
      if (targetResolvers.length === 0) {
        return { chunks: [], category };
      }

      const resolveOptions = {
        category,
        language: options?.language,
        entities: options?.entities,
        topK,
      };

      const chunks = await executeWithTimeout(targetResolvers, query, resolveOptions, topK);

      return { chunks, category };
    },
  };
}

function buildCategoryMap(
  resolvers: readonly SourceResolver[]
): ReadonlyMap<UsageCategory, readonly SourceResolver[]> {
  const map = new Map<UsageCategory, SourceResolver[]>();
  for (const resolver of resolvers) {
    for (const cat of resolver.supportedCategories) {
      const existing = map.get(cat);
      if (existing) {
        existing.push(resolver);
      } else {
        map.set(cat, [resolver]);
      }
    }
  }
  return map;
}

function pickResolvers(
  category: UsageCategory | undefined,
  categoryMap: ReadonlyMap<UsageCategory, readonly SourceResolver[]>,
  allResolvers: readonly SourceResolver[]
): readonly SourceResolver[] {
  if (!category || category === UsageCategory.UNCATEGORIZED) {
    return allResolvers;
  }
  return categoryMap.get(category) ?? allResolvers;
}

function wrapWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Already-aborted signals never fire `abort`; current retrieve() path sets this up before mapping.
    if (signal.aborted) {
      reject(new Error('Retrieval aborted (timeout)'));
      return;
    }
    const onAbort = () => reject(new Error('Retrieval aborted (timeout)'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener('abort', onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

/** Ensures synchronous throws inside `resolve` become promise rejections for `allSettled`. */
function invokeResolver(
  resolver: SourceResolver,
  query: string,
  options: ResolveOptions,
  signal: AbortSignal
): Promise<readonly RetrievedChunk[]> {
  return wrapWithAbort(
    Promise.resolve().then(() => resolver.resolve(query, options)),
    signal
  );
}

function pickSourceUnavailableFailure(failures: readonly unknown[]): AppError | undefined {
  for (const failure of failures) {
    if (failure instanceof AppError && failure.code === ERROR_CODES.SOURCE_UNAVAILABLE) {
      return failure;
    }
  }
  return undefined;
}

function throwWhenAllResolversFailed(
  failures: readonly unknown[],
  resolvers: readonly SourceResolver[]
): void {
  if (failures.length !== resolvers.length || failures.length === 0) {
    return;
  }

  const sourceUnavailable = pickSourceUnavailableFailure(failures);
  if (sourceUnavailable !== undefined) {
    throw sourceUnavailable;
  }

  throw AppError.sourceUnavailable(
    'Unable to load data: all configured sources failed for this query'
  );
}

/**
 * One AbortController + timer per resolver (DEV-59) -- deliberately not one shared controller
 * for the whole fan-out. With a single shared controller, any one resolver running past
 * `RETRIEVAL_TIMEOUT_MS` (e.g. queued behind a cold rate limiter) aborts every other resolver
 * too, including ones with no relationship to the delay that would have succeeded on their own.
 * Isolating the timer per resolver means a slow/queued source only ever costs itself.
 */
function invokeResolverWithOwnTimeout(
  resolver: SourceResolver,
  query: string,
  options: ResolveOptions
): { readonly promise: Promise<readonly RetrievedChunk[]>; readonly clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RETRIEVAL_TIMEOUT_MS);
  const resolveOptionsWithSignal: ResolveOptions = { ...options, signal: controller.signal };
  return {
    promise: invokeResolver(resolver, query, resolveOptionsWithSignal, controller.signal),
    clear: () => clearTimeout(timer),
  };
}

async function executeWithTimeout(
  resolvers: readonly SourceResolver[],
  query: string,
  options: ResolveOptions,
  topK: number
): Promise<readonly RetrievedChunk[]> {
  const invocations = resolvers.map((resolver) =>
    invokeResolverWithOwnTimeout(resolver, query, options)
  );

  try {
    const settled = await Promise.allSettled(invocations.map((i) => i.promise));

    const allChunks: RetrievedChunk[] = [];
    const failures: unknown[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allChunks.push(...result.value);
      } else {
        failures.push(result.reason);
        logger.warn(
          { err: result.reason, failures },
          'Source resolver failed; continuing with other sources'
        );
      }
    }

    if (allChunks.length === 0) {
      throwWhenAllResolversFailed(failures, resolvers);
    }

    // Secondary key (chunk text length) breaks exact score ties -- without it, `Array.sort`'s
    // stability means ties silently fall back to resolver registration order in `container.ts`,
    // so whichever resolver happens to be registered first always wins its own best-vs-best tie
    // against another resolver sharing the category, regardless of actual content quality. Rank-
    // based scoring (see `resolverScoring.ts`) caps every resolver's top result at the same 1.0,
    // making a best-vs-best tie the single most common merge case, not a rare edge case.
    allChunks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.text.length - a.text.length);
    return allChunks.slice(0, topK);
  } finally {
    for (const invocation of invocations) {
      invocation.clear();
    }
  }
}
