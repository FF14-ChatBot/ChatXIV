import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryCacheClient } from '@src/lib/cache/memoryCacheClient.js';

describe('createMemoryCacheClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('get returns null for missing key', async () => {
    const c = createMemoryCacheClient();
    expect(await c.get('nope')).toBeNull();
  });

  it('set and get round-trip value', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', { a: 1 });
    expect(await c.get<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('delete removes a key', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', 1);
    await c.delete('k');
    expect(await c.get('k')).toBeNull();
  });

  it('deleteByPrefix removes matching keys', async () => {
    const c = createMemoryCacheClient();
    await c.set('pre:a', 1);
    await c.set('pre:b', 2);
    await c.set('other', 3);
    await c.deleteByPrefix('pre:');
    expect(await c.get('pre:a')).toBeNull();
    expect(await c.get('other')).toBe(3);
  });

  it('expires entries after ttl', async () => {
    const c = createMemoryCacheClient();
    await c.set('k', 'v', 60);
    expect(await c.get('k')).toBe('v');
    vi.advanceTimersByTime(61_000);
    expect(await c.get('k')).toBeNull();
  });
});
