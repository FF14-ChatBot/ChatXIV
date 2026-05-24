import type { CacheGetResult } from './cacheGetResult.js';

/**
 * Cache client abstraction. Swap Redis / in-memory via DI without changing callers.
 *
 * **TTL convention:** `set` always requires `ttlSeconds` (no client default; choose per upstream).
 * For API aggregation / in-flight fetch locks, `setNx` must pass a short TTL — usually upstream
 * fetch timeout plus a small margin, typically 15–60 seconds. Omit `setNx` TTL only for
 * non-request-scoped keys that are intentionally persistent until `delete`.
 */
export interface CacheClient {
  get<T>(key: string): Promise<CacheGetResult<T>>;
  /** Cached payload; overwrites existing keys. `ttlSeconds` is required (no default). */
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  /**
   * SET NX — true when the key was absent and is now set. Use with TTL for coalescing locks;
   * omit TTL only when cleanup is guaranteed and persistence until `delete` is intentional.
   */
  setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  /** No-op for memory; PING for Redis. Used by health probes. */
  ping(): Promise<boolean>;
}
