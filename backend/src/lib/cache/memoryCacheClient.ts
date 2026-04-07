import type { CacheClient } from './types.js';

interface CacheEntry {
  readonly value: unknown;
  readonly expiresAt: number | null;
}

export function createMemoryCacheClient(): CacheClient {
  const store = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        if (entry) store.delete(key);
        return null;
      }
      return entry.value as T;
    },

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
      store.set(key, { value, expiresAt });
    },

    async delete(key: string): Promise<void> {
      store.delete(key);
    },

    async deleteByPrefix(prefix: string): Promise<void> {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    },
  };
}
