/**
 * Cached upstream response plus attribution metadata (TR-10).
 * Stored as the cache value so consumers can build citations without re-fetching.
 */
export type CachedUpstreamPayload<T> = {
  readonly data: T;
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly patchOrDate?: string;
  readonly lastUpdated?: string;
  readonly fetchedAt: string;
};

export function createCachedUpstreamPayload<T>(
  data: T,
  attribution: Readonly<{
    sourceName: string;
    sourceUrl?: string;
    patchOrDate?: string;
    lastUpdated?: string;
  }>
): CachedUpstreamPayload<T> {
  return {
    data,
    sourceName: attribution.sourceName,
    ...(attribution.sourceUrl !== undefined ? { sourceUrl: attribution.sourceUrl } : {}),
    ...(attribution.patchOrDate !== undefined ? { patchOrDate: attribution.patchOrDate } : {}),
    ...(attribution.lastUpdated !== undefined ? { lastUpdated: attribution.lastUpdated } : {}),
    fetchedAt: new Date().toISOString(),
  };
}
