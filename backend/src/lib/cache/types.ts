import type { CacheGetResult } from './cacheGetResult.js';

/** Cache client abstraction. Swap Redis / in-memory via DI without changing callers. */
export interface CacheClient {
  get<T>(key: string): Promise<CacheGetResult<T>>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  /** No-op for memory; PING for Redis. Used by health probes. */
  ping(): Promise<boolean>;
}
