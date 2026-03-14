import { describe, it, expect } from 'vitest';
import { createMemoryStore } from './memoryStore.js';

describe('createMemoryStore', () => {
  it('allows requests under capacity', () => {
    const store = createMemoryStore();
    const config = { capacity: 3, refillPerMin: 1 };
    expect(store.consume('key1', config).allowed).toBe(true);
    expect(store.consume('key1', config).allowed).toBe(true);
    expect(store.consume('key1', config).allowed).toBe(true);
    expect(store.consume('key1', config).allowed).toBe(false);
  });

  it('returns retryAfterSeconds when not allowed', () => {
    const store = createMemoryStore();
    const config = { capacity: 1, refillPerMin: 2 };
    store.consume('k', config);
    const result = store.consume('k', config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeDefined();
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('isolates keys', () => {
    const store = createMemoryStore();
    const config = { capacity: 1, refillPerMin: 1 };
    expect(store.consume('a', config).allowed).toBe(true);
    expect(store.consume('a', config).allowed).toBe(false);
    expect(store.consume('b', config).allowed).toBe(true);
  });
});
