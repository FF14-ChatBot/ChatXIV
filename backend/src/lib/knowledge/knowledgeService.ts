import { UsageCategory } from '@chatxiv/cdm';
import { logger } from '../observability/logger.js';
import type {
  KnowledgeService,
  ResolveOptions,
  RetrievalResult,
  RetrieveOptions,
  SourceResolver,
  RetrievedChunk,
} from './types.js';

const DEFAULT_TOP_K = 8;
const RETRIEVAL_TIMEOUT_MS = 6_000;

/**
 * Registry-based knowledge service. Routes queries to the appropriate
 * SourceResolver(s) based on the classified category.
 *
 * When category is UNCATEGORIZED or confidence is low, queries all
 * resolvers in parallel and merges results by score.
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

/**
 * Links a promise to an {@link AbortSignal}: rejects when the signal aborts
 * (e.g. retrieval budget exceeded) without leaving dangling listeners.
 */
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

async function executeWithTimeout(
  resolvers: readonly SourceResolver[],
  query: string,
  options: ResolveOptions,
  topK: number
): Promise<readonly RetrievedChunk[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RETRIEVAL_TIMEOUT_MS);

  try {
    const settled = await Promise.allSettled(
      resolvers.map((r) => wrapWithAbort(r.resolve(query, options), controller.signal))
    );

    const allChunks: RetrievedChunk[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allChunks.push(...result.value);
      } else {
        logger.warn(
          { err: result.reason },
          'Source resolver failed; continuing with other sources'
        );
      }
    }

    allChunks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return allChunks.slice(0, topK);
  } catch (err) {
    logger.error({ err }, 'Retrieval timed out or failed; returning empty chunks');
    return [];
  } finally {
    clearTimeout(timer);
  }
}
