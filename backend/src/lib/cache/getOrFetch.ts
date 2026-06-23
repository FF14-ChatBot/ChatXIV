import type { CacheClient } from './types.js';
import { CacheGetOutcome } from './cacheGetResult.js';
import {
  requireCacheHealthy,
  throwIfCacheUnavailable,
  type CacheUnavailableContext,
} from './cacheGuards.js';
import { AppError } from '../errors/AppError.js';
import {
  CACHE_FETCH_LOCK_POLL_ATTEMPTS,
  CACHE_FETCH_LOCK_POLL_INTERVAL_MS,
  CACHE_FETCH_LOCK_TTL_SECONDS,
} from '../config/constants.js';

export type GetOrFetchResult<T> = Readonly<{
  value: T;
  stale: boolean;
}>;

export type GetOrFetchParams<T> = Readonly<{
  cache: CacheClient;
  key: string;
  /** Fresh TTL: entries younger than this are served without re-fetching upstream. */
  ttlSeconds: number;
  /** TR-9 grace beyond {@link ttlSeconds}; cache retention = ttl + grace when set. */
  staleGraceSeconds?: number;
  dataSource: CacheUnavailableContext['dataSource'];
  fetch: () => Promise<T>;
  /** Required for stale fallback; reads `fetchedAt` (or equivalent) from cached payloads. */
  getFetchedAt?: (value: T) => string | undefined;
}>;

const LOCK_KEY_SUFFIX = ':lock';

function lockKeyFor(key: string): string {
  return `${key}${LOCK_KEY_SUFFIX}`;
}

function ageMs(isoTimestamp: string): number {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() - parsed;
}

function isFresh(fetchedAt: string, ttlSeconds: number): boolean {
  return ageMs(fetchedAt) <= ttlSeconds * 1_000;
}

function isWithinGrace(fetchedAt: string, ttlSeconds: number, graceSeconds: number): boolean {
  return ageMs(fetchedAt) <= (ttlSeconds + graceSeconds) * 1_000;
}

function retentionSeconds(ttlSeconds: number, graceSeconds: number): number {
  return graceSeconds > 0 ? ttlSeconds + graceSeconds : ttlSeconds;
}

function resultFromCachedHit<T>(value: T, params: GetOrFetchParams<T>): GetOrFetchResult<T> {
  const fetchedAt = params.getFetchedAt?.(value);
  if (fetchedAt === undefined || params.getFetchedAt === undefined) {
    return { value, stale: false };
  }
  return { value, stale: !isFresh(fetchedAt, params.ttlSeconds) };
}

async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStaleFallback<T>(
  cache: CacheClient,
  key: string,
  params: GetOrFetchParams<T>,
  context: CacheUnavailableContext
): Promise<GetOrFetchResult<T> | undefined> {
  const grace = params.staleGraceSeconds ?? 0;
  if (grace <= 0 || params.getFetchedAt === undefined) {
    return undefined;
  }

  const retry = await cache.get<T>(key);
  throwIfCacheUnavailable(retry, context);
  if (retry.outcome !== CacheGetOutcome.Hit) {
    return undefined;
  }

  const fetchedAt = params.getFetchedAt(retry.value);
  if (fetchedAt === undefined || !isWithinGrace(fetchedAt, params.ttlSeconds, grace)) {
    return undefined;
  }

  return { value: retry.value, stale: !isFresh(fetchedAt, params.ttlSeconds) };
}

async function pollForCachedHit<T>(
  params: GetOrFetchParams<T>,
  context: CacheUnavailableContext
): Promise<GetOrFetchResult<T> | undefined> {
  for (let attempt = 0; attempt < CACHE_FETCH_LOCK_POLL_ATTEMPTS; attempt += 1) {
    await sleepMs(CACHE_FETCH_LOCK_POLL_INTERVAL_MS);
    const retry = await params.cache.get<T>(params.key);
    throwIfCacheUnavailable(retry, context);
    if (retry.outcome === CacheGetOutcome.Hit) {
      return resultFromCachedHit(retry.value, params);
    }
  }
  return undefined;
}

async function runFetchWithStaleFallback<T>(
  params: GetOrFetchParams<T>,
  context: CacheUnavailableContext,
  retention: number,
  staleEligible: T | undefined
): Promise<GetOrFetchResult<T>> {
  try {
    const value = await params.fetch();
    await params.cache.set(params.key, value, retention);
    return { value, stale: false };
  } catch (err) {
    if (staleEligible !== undefined) {
      return { value: staleEligible, stale: true };
    }

    const fallback = await readStaleFallback(params.cache, params.key, params, context);
    if (fallback !== undefined) {
      return fallback;
    }

    if (err instanceof AppError) {
      throw err;
    }

    throw AppError.sourceUnavailable(
      `Unable to load data from ${params.dataSource}: upstream request failed`
    );
  }
}

async function coalescedFetch<T>(
  params: GetOrFetchParams<T>,
  context: CacheUnavailableContext,
  retention: number,
  staleEligible: T | undefined
): Promise<GetOrFetchResult<T>> {
  const lockKey = lockKeyFor(params.key);
  let acquired = await params.cache.setNx(lockKey, '1', CACHE_FETCH_LOCK_TTL_SECONDS);

  if (!acquired) {
    const polled = await pollForCachedHit(params, context);
    if (polled !== undefined) {
      return polled;
    }
    acquired = await params.cache.setNx(lockKey, '1', CACHE_FETCH_LOCK_TTL_SECONDS);
    if (!acquired) {
      const polledAgain = await pollForCachedHit(params, context);
      if (polledAgain !== undefined) {
        return polledAgain;
      }
    }
  }

  if (acquired) {
    try {
      return await runFetchWithStaleFallback(params, context, retention, staleEligible);
    } finally {
      await params.cache.delete(lockKey);
    }
  }

  // TODO(DEV-23): Lock contention fallback can duplicate upstream fetches; poll longer or block until lock clears.
  return runFetchWithStaleFallback(params, context, retention, staleEligible);
}

/**
 * Cache-aside with TR-9 stale fallback: healthy cache → get; on miss or soft-expiry fetch upstream;
 * on fetch failure serve a grace-window cached copy when available.
 *
 * TODO(DEV-23): Optional background refresh when entry is near fresh TTL (Cache-Layer-Per-Category.md §3).
 */
export async function getOrFetch<T>(params: GetOrFetchParams<T>): Promise<GetOrFetchResult<T>> {
  const context: CacheUnavailableContext = { dataSource: params.dataSource };
  requireCacheHealthy(context);

  const grace = params.staleGraceSeconds ?? 0;
  const retention = retentionSeconds(params.ttlSeconds, grace);

  const cached = await params.cache.get<T>(params.key);
  throwIfCacheUnavailable(cached, context);

  let staleEligible: T | undefined;

  if (cached.outcome === CacheGetOutcome.Hit) {
    const fetchedAt = params.getFetchedAt?.(cached.value);
    if (fetchedAt === undefined || params.getFetchedAt === undefined) {
      return { value: cached.value, stale: false };
    }
    if (isFresh(fetchedAt, params.ttlSeconds)) {
      return { value: cached.value, stale: false };
    }
    if (isWithinGrace(fetchedAt, params.ttlSeconds, grace)) {
      staleEligible = cached.value;
    }
  }

  return coalescedFetch(params, context, retention, staleEligible);
}
