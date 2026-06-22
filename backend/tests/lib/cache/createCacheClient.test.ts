import { describe, it, expect, vi, afterEach } from 'vitest';

const store = new Map<string, string>();
const mockRedis = {
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  set: vi.fn(async (key: string, value: string, opts?: { EX?: number }) => {
    store.set(key, value);
    void opts;
  }),
  del: vi.fn(async (key: string | string[]) => {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) store.delete(k);
  }),
  scanIterator: vi.fn(async function* () {
    yield* store.keys();
  }),
};

vi.mock('@src/lib/cache/redisConnection.js', () => ({
  connectRedis: vi.fn().mockResolvedValue(undefined),
  getRedisClient: vi.fn(() => mockRedis),
}));

import { createCacheClientForConfig } from '@src/lib/cache/createCacheClient.js';
import { CacheGetOutcome } from '@src/lib/cache/cacheGetResult.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';

describe('createCacheClientForConfig', () => {
  afterEach(() => {
    cacheBackendHealth.configure('memory');
  });

  it('returns memory client for memory backend', async () => {
    const client = await createCacheClientForConfig({
      backend: 'memory',
      redisUrl: undefined,
      redisRequired: false,
    });
    expect(await client.get('k')).toEqual({ outcome: 'miss' });
  });

  it('connects redis for redis backend', async () => {
    store.clear();
    const { connectRedis } = await import('@src/lib/cache/redisConnection.js');
    const client = await createCacheClientForConfig({
      backend: 'redis',
      redisUrl: 'redis://localhost:6379',
      redisRequired: true,
    });
    expect(connectRedis).toHaveBeenCalledWith('redis://localhost:6379');
    await client.set('a', 1, 3600);
    expect((await client.get<number>('a')).outcome).toBe(CacheGetOutcome.Hit);
  });
});
