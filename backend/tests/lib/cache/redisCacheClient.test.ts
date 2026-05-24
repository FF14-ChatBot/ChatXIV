import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@src/lib/cache/redisConnection.js', () => ({
  pingRedis: vi.fn().mockResolvedValue(true),
}));

import { createRedisCacheClient } from '@src/lib/cache/redisCacheClient.js';
import { CacheGetOutcome } from '@src/lib/cache/cacheGetResult.js';
import { setActiveCacheBackend } from '@src/lib/cache/cacheHealth.js';
import type { RedisClientType } from 'redis';

function createMockRedis(): RedisClientType {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, opts?: { EX?: number }) => {
      store.set(key, value);
      void opts;
    }),
    del: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) store.delete(k);
    }),
    scanIterator: vi.fn(async function* (opts?: { MATCH?: string }) {
      const pattern = opts?.MATCH?.replace(/\*$/, '') ?? '';
      for (const key of store.keys()) {
        if (key.startsWith(pattern)) yield key;
      }
    }),
  } as unknown as RedisClientType;
}

describe('createRedisCacheClient', () => {
  beforeEach(() => {
    setActiveCacheBackend('redis');
  });

  it('returns hit after set', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await client.set('item', { id: 1 }, 60);
    const result = await client.get<{ id: number }>('item');
    expect(result.outcome).toBe(CacheGetOutcome.Hit);
    if (result.outcome === CacheGetOutcome.Hit) {
      expect(result.value).toEqual({ id: 1 });
    }
  });

  it('returns unavailable when get throws', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.get).mockRejectedValueOnce(new Error('connection reset'));
    const client = createRedisCacheClient(redis);
    const result = await client.get('item');
    expect(result.outcome).toBe(CacheGetOutcome.Unavailable);
  });

  it('set without ttl stores value', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await client.set('plain', { x: 1 });
    expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
      expect.stringContaining('plain'),
      JSON.stringify({ x: 1 })
    );
  });

  it('ping delegates to pingRedis', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await expect(client.ping()).resolves.toBe(true);
  });

  it('logs and continues when set fails', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.set).mockRejectedValueOnce(new Error('write fail'));
    const client = createRedisCacheClient(redis);
    await expect(client.set('k', 1)).resolves.toBeUndefined();
  });

  it('deleteByPrefix removes matching keys', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await client.set('ns:a', 1);
    await client.set('ns:b', 2);
    await client.set('other', 3);
    await client.deleteByPrefix('ns:');
    expect((await client.get('ns:a')).outcome).toBe(CacheGetOutcome.Miss);
    expect((await client.get('other')).outcome).toBe(CacheGetOutcome.Hit);
  });
});
