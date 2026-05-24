import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@src/lib/cache/redisConnection.js', () => ({
  pingRedis: vi.fn().mockResolvedValue(true),
}));

import { createRedisCacheClient } from '@src/lib/cache/redisCacheClient.js';
import { CacheGetOutcome } from '@src/lib/cache/cacheGetResult.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';
import type { RedisClientType } from 'redis';

function createMockRedis(): RedisClientType {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, opts?: { EX?: number; NX?: boolean }) => {
      if (opts?.NX && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return 'OK';
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
    cacheBackendHealth.configure('redis');
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

  it('setNx returns true only when the key is absent', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await expect(client.setNx('lock', { v: 1 }, 30)).resolves.toBe(true);
    await expect(client.setNx('lock', { v: 2 }, 30)).resolves.toBe(false);
    expect(vi.mocked(redis.set)).toHaveBeenLastCalledWith(
      expect.stringContaining('lock'),
      JSON.stringify({ v: 2 }),
      { NX: true, EX: 30 }
    );
    const hit = await client.get<{ v: number }>('lock');
    expect(hit.outcome).toBe(CacheGetOutcome.Hit);
    if (hit.outcome === CacheGetOutcome.Hit) {
      expect(hit.value).toEqual({ v: 1 });
    }
  });

  it('set always applies EX ttl', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await client.set('plain', { x: 1 }, 300);
    expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
      expect.stringContaining('plain'),
      JSON.stringify({ x: 1 }),
      { EX: 300 }
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
    await expect(client.set('k', 1, 60)).resolves.toBeUndefined();
  });

  it('deleteByPrefix removes matching keys', async () => {
    const redis = createMockRedis();
    const client = createRedisCacheClient(redis);
    await client.set('ns:a', 1, 3600);
    await client.set('ns:b', 2, 3600);
    await client.set('other', 3, 3600);
    await client.deleteByPrefix('ns:');
    expect((await client.get('ns:a')).outcome).toBe(CacheGetOutcome.Miss);
    expect((await client.get('other')).outcome).toBe(CacheGetOutcome.Hit);
  });
});
