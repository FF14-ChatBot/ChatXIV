import { logger } from '../observability/logger.js';
import { ResolvedCacheBackend } from '../config/constants.js';

export interface CacheReadinessCheck {
  readonly ok: boolean;
  readonly backend: ResolvedCacheBackend;
  readonly message?: string;
}

/**
 * Tracks whether the active Redis cache backend is reachable.
 * Updated by {@link redisConnection}, {@link redisCacheClient}, and the health probe — not by API handlers.
 */
class CacheBackendHealth {
  private activeBackend: ResolvedCacheBackend = ResolvedCacheBackend.Memory;
  private redisHealthy = true;
  private lastRedisFailure: Error | undefined;
  private lastLoggedUnhealthy = false;

  configure(backend: ResolvedCacheBackend): void {
    this.activeBackend = backend;
    this.redisHealthy = true;
    this.lastRedisFailure = undefined;
    this.lastLoggedUnhealthy = false;
  }

  isRedisBackend(): boolean {
    return this.activeBackend === ResolvedCacheBackend.Redis;
  }

  /**
   * Whether the active cache backend can serve reads/writes.
   * In-memory cache is always healthy; Redis health reflects probes and operation failures.
   */
  isHealthy(): boolean {
    switch (this.activeBackend) {
      case ResolvedCacheBackend.Memory:
        return true;
      case ResolvedCacheBackend.Redis:
        return this.redisHealthy;
    }
  }

  getLastFailure(): Error | undefined {
    return this.lastRedisFailure;
  }

  readiness(): CacheReadinessCheck {
    if (this.activeBackend === ResolvedCacheBackend.Memory) {
      return { ok: true, backend: this.activeBackend };
    }
    if (this.redisHealthy) {
      return { ok: true, backend: this.activeBackend };
    }
    const detail = this.lastRedisFailure?.message ?? 'Redis cache is unavailable';
    return {
      ok: false,
      backend: this.activeBackend,
      message: detail,
    };
  }

  /** Called when a Redis command or PING succeeds (including cache misses). */
  recordOperationSuccess(): void {
    if (this.activeBackend !== ResolvedCacheBackend.Redis) return;
    if (!this.redisHealthy) {
      logger.info('Cache backend recovered');
      this.lastLoggedUnhealthy = false;
    }
    this.redisHealthy = true;
    this.lastRedisFailure = undefined;
  }

  /** Called when Redis is unreachable or returns an unexpected error. */
  recordOperationFailure(err: unknown): void {
    if (this.activeBackend !== ResolvedCacheBackend.Redis) return;
    this.lastRedisFailure = err instanceof Error ? err : new Error(String(err));
    if (this.redisHealthy || !this.lastLoggedUnhealthy) {
      logger.error({ err }, 'Cache backend unavailable');
      this.lastLoggedUnhealthy = true;
    }
    this.redisHealthy = false;
  }
}

export const cacheBackendHealth = new CacheBackendHealth();
