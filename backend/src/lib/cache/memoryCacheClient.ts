import type pino from 'pino';
import type { CacheClient } from './types.js';
import { cacheHit, cacheMiss } from './cacheGetResult.js';
import { toCacheStorageKey } from './cacheKeys.js';

interface CacheEntry {
  readonly value: unknown;
  readonly expiresAt: number | null;
}

export function createMemoryCacheClient(log: pino.Logger): CacheClient {
  const store = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  function storageKey(key: string): string {
    return toCacheStorageKey(key);
  }

  return {
    async get<T>(key: string) {
      const entry = store.get(storageKey(key));
      if (!entry || isExpired(entry)) {
        if (entry) store.delete(storageKey(key));
        log.debug({ key }, 'Cache miss');
        return cacheMiss<T>();
      }
      log.debug({ key }, 'Cache hit');
      return cacheHit(entry.value as T);
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      const expiresAt = Date.now() + ttlSeconds * 1000;
      store.set(storageKey(key), { value, expiresAt });
    },

    async setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
      const k = storageKey(key);
      const existing = store.get(k);
      if (existing && !isExpired(existing)) {
        return false;
      }
      const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
      store.set(k, { value, expiresAt });
      return true;
    },

    async delete(key: string): Promise<void> {
      store.delete(storageKey(key));
    },

    async deleteByPrefix(prefix: string): Promise<void> {
      const fullPrefix = storageKey(prefix);
      for (const k of store.keys()) {
        if (k.startsWith(fullPrefix)) {
          store.delete(k);
        }
      }
    },

    async ping(): Promise<boolean> {
      return true;
    },
  };
}
