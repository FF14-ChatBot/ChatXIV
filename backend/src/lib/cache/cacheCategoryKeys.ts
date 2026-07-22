import { createHash } from 'node:crypto';

/**
 * Logical cache key segments (prefix applied by {@link toCacheStorageKey}).
 *
 * TODO(DEV-23): Add per-category key builders (`bisKey`, `wikiKey`, `questKey`, etc.) per
 * Cache-Layer-Per-Category.md §2; wire resolvers to category-specific keys instead of search-only.
 */

export function xivApiSearchCacheKey(params: {
  readonly query: string;
  readonly language: string;
  readonly limit: number;
}): string {
  const normalizedQuery = params.query.trim().toLowerCase();
  const digest = createHash('sha256')
    .update(`${normalizedQuery}|${params.language}|${params.limit}`)
    .digest('hex');
  return `xivapi:search:${params.language}:${digest}`;
}
