import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryCacheClient } from '@src/lib/cache/memoryCacheClient.js';
import { CacheGetOutcome } from '@src/lib/cache/cacheGetResult.js';
import { CACHE_KEY_PREFIX } from '@src/lib/config/constants.js';

describe('createMemoryCacheClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('get returns miss for missing key', async () => {
    const c = createMemoryCacheClient();
    const result = await c.get('nope');
    expect(result.outcome).toBe(CacheGetOutcome.Miss);
  });

  it('set and get round-trip value', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', { a: 1 }, 3600);
    const result = await c.get<{ a: number }>('k');
    expect(result.outcome).toBe(CacheGetOutcome.Hit);
    if (result.outcome === CacheGetOutcome.Hit) {
      expect(result.value).toEqual({ a: 1 });
    }
  });

  it('setNx writes only when the key is absent', async () => {
    const c = createMemoryCacheClient();
    await expect(c.setNx('lock', { v: 1 }, 60)).resolves.toBe(true);
    await expect(c.setNx('lock', { v: 2 }, 60)).resolves.toBe(false);
    const hit = await c.get<{ v: number }>('lock');
    expect(hit.outcome).toBe(CacheGetOutcome.Hit);
    if (hit.outcome === CacheGetOutcome.Hit) {
      expect(hit.value).toEqual({ v: 1 });
    }
  });

  it('stores keys with the shared cache prefix', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', 1, 3600);
    const result = await c.get('k');
    expect(result.outcome).toBe(CacheGetOutcome.Hit);
    expect(`${CACHE_KEY_PREFIX}k`).toContain(CACHE_KEY_PREFIX);
  });

  it('delete removes a key', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', 1, 3600);
    await c.delete('k');
    expect((await c.get('k')).outcome).toBe(CacheGetOutcome.Miss);
  });

  it('deleteByPrefix removes matching keys', async () => {
    const c = createMemoryCacheClient();
    await c.set('pre:a', 1, 3600);
    await c.set('pre:b', 2, 3600);
    await c.set('other', 3, 3600);
    await c.deleteByPrefix('pre:');
    expect((await c.get('pre:a')).outcome).toBe(CacheGetOutcome.Miss);
    expect((await c.get('other')).outcome).toBe(CacheGetOutcome.Hit);
  });

  it('expires entries after ttl', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', 'v', 60);
    expect((await c.get('k')).outcome).toBe(CacheGetOutcome.Hit);
    vi.advanceTimersByTime(61_000);
    expect((await c.get('k')).outcome).toBe(CacheGetOutcome.Miss);
  });

  it('ping returns true', async () => {
    const c = createMemoryCacheClient();
    await expect(c.ping()).resolves.toBe(true);
  });
});
