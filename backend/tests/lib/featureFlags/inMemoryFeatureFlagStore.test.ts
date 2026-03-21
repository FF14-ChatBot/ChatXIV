import { describe, it, expect } from 'vitest';
import { createInMemoryFeatureFlagStore } from '@src/lib/featureFlags/inMemoryFeatureFlagStore.js';

describe('lib/featureFlags/inMemoryFeatureFlagStore', () => {
  it('starts empty', async () => {
    const store = createInMemoryFeatureFlagStore();
    expect(await store.getAll()).toEqual({});
  });

  it('set() creates a flag and get() retrieves it', async () => {
    const store = createInMemoryFeatureFlagStore();
    await store.set('feature-x', true);
    const record = await store.get('feature-x');
    expect(record).toBeDefined();
    expect(record!.enabled).toBe(true);
    expect(record!.updatedAt).toBeTruthy();
  });

  it('set() updates an existing flag', async () => {
    const store = createInMemoryFeatureFlagStore();
    await store.set('feature-x', true);
    await store.set('feature-x', false);
    const record = await store.get('feature-x');
    expect(record!.enabled).toBe(false);
  });

  it('getAll() returns all flags', async () => {
    const store = createInMemoryFeatureFlagStore();
    await store.set('a', true);
    await store.set('b', false);
    const all = await store.getAll();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['a'].enabled).toBe(true);
    expect(all['b'].enabled).toBe(false);
  });

  it('get() returns undefined for non-existent flag', async () => {
    const store = createInMemoryFeatureFlagStore();
    expect(await store.get('nope')).toBeUndefined();
  });

  it('remove() deletes a flag and returns true', async () => {
    const store = createInMemoryFeatureFlagStore();
    await store.set('feature-x', true);
    const removed = await store.remove('feature-x');
    expect(removed).toBe(true);
    expect(await store.get('feature-x')).toBeUndefined();
  });

  it('remove() returns false for non-existent flag', async () => {
    const store = createInMemoryFeatureFlagStore();
    expect(await store.remove('nope')).toBe(false);
  });
});
