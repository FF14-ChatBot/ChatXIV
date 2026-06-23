import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pino from 'pino';
import { getOrFetch } from '@src/lib/cache/getOrFetch.js';
import { cacheHit, cacheMiss, cacheUnavailable } from '@src/lib/cache/cacheGetResult.js';
import { createMockCacheClient } from '@test/mocks/cacheClient.mock.js';
import { createMemoryCacheClient } from '@src/lib/cache/memoryCacheClient.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { ERROR_CODES } from '@chatxiv/cdm';
import { CACHE_FETCH_LOCK_TTL_SECONDS } from '@src/lib/config/constants.js';

const silentLog = pino({ level: 'silent' });

type TimedPayload = Readonly<{ body: string; fetchedAt: string }>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('getOrFetch', () => {
  beforeEach(() => {
    cacheBackendHealth.configure('memory');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cached value on hit without calling fetch', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheHit({ ok: true }));
    const fetch = vi.fn();

    const result = await getOrFetch({
      cache,
      key: 'k',
      ttlSeconds: 60,
      dataSource: 'XIVAPI',
      fetch,
    });

    expect(result).toEqual({ value: { ok: true }, stale: false });
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('fetches, stores with retention TTL, and returns on miss', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheMiss());
    const fetch = vi.fn().mockResolvedValue({ fresh: true });

    const result = await getOrFetch({
      cache,
      key: 'k',
      ttlSeconds: 120,
      staleGraceSeconds: 60,
      dataSource: 'XIVAPI',
      fetch,
    });

    expect(result).toEqual({ value: { fresh: true }, stale: false });
    expect(fetch).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledWith('k', { fresh: true }, 180);
    expect(cache.setNx).toHaveBeenCalledWith('k:lock', '1', CACHE_FETCH_LOCK_TTL_SECONDS);
    expect(cache.delete).toHaveBeenCalledWith('k:lock');
  });

  it('serves stale cache when upstream fails after soft expiry within grace', async () => {
    const cache = createMockCacheClient();
    const staleFetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();
    const payload: TimedPayload = { body: 'cached', fetchedAt: staleFetchedAt };
    cache.get.mockResolvedValue(cacheHit(payload));
    const fetch = vi.fn().mockRejectedValue(new Error('upstream down'));

    const result = await getOrFetch<TimedPayload>({
      cache,
      key: 'k',
      ttlSeconds: 86_400,
      staleGraceSeconds: 86_400,
      dataSource: 'XIVAPI',
      getFetchedAt: (value) => value.fetchedAt,
      fetch,
    });

    expect(result).toEqual({ value: payload, stale: true });
    expect(fetch).toHaveBeenCalledOnce();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('serves stale cache on miss when a grace-window entry still exists', async () => {
    const cache = createMockCacheClient();
    const staleFetchedAt = new Date(Date.now() - 30 * 60 * 60 * 1_000).toISOString();
    const payload: TimedPayload = { body: 'cached', fetchedAt: staleFetchedAt };
    cache.get.mockResolvedValueOnce(cacheMiss()).mockResolvedValueOnce(cacheHit(payload));
    const fetch = vi.fn().mockRejectedValue(new Error('upstream down'));

    const result = await getOrFetch<TimedPayload>({
      cache,
      key: 'k',
      ttlSeconds: 86_400,
      staleGraceSeconds: 86_400,
      dataSource: 'XIVAPI',
      getFetchedAt: (value) => value.fetchedAt,
      fetch,
    });

    expect(result).toEqual({ value: payload, stale: true });
  });

  it('throws SOURCE_UNAVAILABLE when upstream fails with no stale fallback', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheMiss());
    const fetch = vi.fn().mockRejectedValue(new Error('upstream down'));

    await expect(
      getOrFetch({
        cache,
        key: 'k',
        ttlSeconds: 60,
        dataSource: 'XIVAPI',
        fetch,
      })
    ).rejects.toMatchObject({
      status: 503,
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('throws when cache backend is unhealthy', async () => {
    cacheBackendHealth.configure('redis');
    cacheBackendHealth.recordOperationFailure(new Error('redis down'));
    const cache = createMockCacheClient();

    await expect(
      getOrFetch({
        cache,
        key: 'k',
        ttlSeconds: 60,
        dataSource: 'XIVAPI',
        fetch: vi.fn(),
      })
    ).rejects.toBeInstanceOf(AppError);

    cacheBackendHealth.configure('memory');
  });

  it('throws when get returns unavailable', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheUnavailable(new Error('timeout')));

    await expect(
      getOrFetch({
        cache,
        key: 'k',
        ttlSeconds: 60,
        dataSource: 'XIVAPI',
        fetch: vi.fn(),
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('releases the fetch lock after upstream failure', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheMiss());
    const fetch = vi.fn().mockRejectedValue(new Error('upstream down'));

    await expect(
      getOrFetch({
        cache,
        key: 'k',
        ttlSeconds: 60,
        dataSource: 'XIVAPI',
        fetch,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.SOURCE_UNAVAILABLE });

    expect(cache.delete).toHaveBeenCalledWith('k:lock');
  });

  it('coalesces concurrent misses into one upstream fetch', async () => {
    const cache = createMemoryCacheClient(silentLog);
    const fetch = vi.fn().mockImplementation(async () => {
      await delay(100);
      return { fresh: true };
    });

    const params = {
      cache,
      key: 'coalesce-k',
      ttlSeconds: 120,
      dataSource: 'XIVAPI' as const,
      fetch,
    };

    const [first, second] = await Promise.all([getOrFetch(params), getOrFetch(params)]);

    expect(fetch).toHaveBeenCalledOnce();
    expect(first).toEqual({ value: { fresh: true }, stale: false });
    expect(second).toEqual(first);
  });

  it('rethrows AppError from fetch without wrapping', async () => {
    const cache = createMockCacheClient();
    cache.get.mockResolvedValue(cacheMiss());
    const fetch = vi.fn().mockRejectedValue(AppError.sourceUnavailable('XIVAPI timeout'));

    await expect(
      getOrFetch({
        cache,
        key: 'k',
        ttlSeconds: 60,
        dataSource: 'XIVAPI',
        fetch,
      })
    ).rejects.toMatchObject({
      message: 'XIVAPI timeout',
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('returns a polled cache hit when the fetch lock is held', async () => {
    vi.useFakeTimers();
    const cache = createMockCacheClient();
    cache.setNx.mockResolvedValue(false);
    cache.get.mockResolvedValueOnce(cacheMiss()).mockResolvedValueOnce(cacheHit({ shared: true }));
    const fetch = vi.fn();

    const resultPromise = getOrFetch({
      cache,
      key: 'k',
      ttlSeconds: 60,
      dataSource: 'XIVAPI',
      fetch,
    });
    await vi.advanceTimersByTimeAsync(50);
    const result = await resultPromise;

    expect(result).toEqual({ value: { shared: true }, stale: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches without lock when lock contention polling exhausts', async () => {
    vi.useFakeTimers();
    const cache = createMockCacheClient();
    cache.setNx.mockResolvedValue(false);
    cache.get.mockResolvedValue(cacheMiss());
    const fetch = vi.fn().mockResolvedValue({ fallback: true });

    const resultPromise = getOrFetch({
      cache,
      key: 'k',
      ttlSeconds: 60,
      dataSource: 'XIVAPI',
      fetch,
    });
    await vi.advanceTimersByTimeAsync(50 * 20);
    const result = await resultPromise;

    expect(result).toEqual({ value: { fallback: true }, stale: false });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('treats fresh timed cache hits as non-stale', async () => {
    const cache = createMockCacheClient();
    const payload: TimedPayload = { body: 'cached', fetchedAt: new Date().toISOString() };
    cache.get.mockResolvedValue(cacheHit(payload));
    const fetch = vi.fn();

    const result = await getOrFetch<TimedPayload>({
      cache,
      key: 'k',
      ttlSeconds: 86_400,
      staleGraceSeconds: 86_400,
      dataSource: 'XIVAPI',
      getFetchedAt: (value) => value.fetchedAt,
      fetch,
    });

    expect(result).toEqual({ value: payload, stale: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
