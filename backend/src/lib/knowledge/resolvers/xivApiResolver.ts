import {
  CACHE_STALE_GRACE_SECONDS,
  CACHE_TTL_XIVAPI_SEARCH_SECONDS,
  XIVAPI_DATA_SOURCE,
  XIVAPI_SEARCH_DEFAULT_LIMIT,
} from '../../config/constants.js';
import { xivApiSearchCacheKey } from '../../cache/cacheCategoryKeys.js';
import {
  createCachedUpstreamPayload,
  type CachedUpstreamPayload,
} from '../../cache/cachedUpstreamPayload.js';
import { getOrFetch } from '../../getOrFetch.js';
import type { CacheClient } from '../../cache/types.js';
import type { XivApiClient, XivApiSearchResult } from '../../xivapi/types.js';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';
import {
  mapXivApiSearchToChunks,
  normalizeXivApiLanguage,
  XivApiResolverCategories,
  xivApiSearchSourceCitation,
} from './xivApiResolverSupport.js';

export type XivApiResolverDeps = Readonly<{
  client: XivApiClient;
  cache: CacheClient;
}>;

export function createXivApiResolver(deps: XivApiResolverDeps): SourceResolver {
  return {
    supportedCategories: [...XivApiResolverCategories],
    async resolve(query: string, options?: ResolveOptions): Promise<readonly RetrievedChunk[]> {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      const language = normalizeXivApiLanguage(options?.language);
      const limit = options?.topK ?? XIVAPI_SEARCH_DEFAULT_LIMIT;

      // TODO(DEV-23): Pass category-aware TTL/grace and dedicated keys when not using search-only MVP.
      const { value: cached, stale } = await getOrFetch<CachedUpstreamPayload<XivApiSearchResult>>({
        cache: deps.cache,
        key: xivApiSearchCacheKey({ query: trimmed, language, limit }),
        ttlSeconds: CACHE_TTL_XIVAPI_SEARCH_SECONDS,
        staleGraceSeconds: CACHE_STALE_GRACE_SECONDS,
        dataSource: XIVAPI_DATA_SOURCE,
        getFetchedAt: (payload) => payload.fetchedAt,
        fetch: async () => {
          const result = await deps.client.search({
            query: trimmed,
            language,
            limit,
            fields: 'Name',
            transient: 'Description',
          });
          return createCachedUpstreamPayload(result, xivApiSearchSourceCitation(result.version));
        },
      });

      const citation = {
        sourceName: cached.sourceName,
        ...(cached.sourceUrl !== undefined ? { sourceUrl: cached.sourceUrl } : {}),
        ...(cached.patchOrDate !== undefined ? { patchOrDate: cached.patchOrDate } : {}),
        ...(cached.lastUpdated !== undefined ? { lastUpdated: cached.lastUpdated } : {}),
        ...(stale ? { stale: true as const } : {}),
      };

      return mapXivApiSearchToChunks(cached.data, citation);
    },
  };
}
