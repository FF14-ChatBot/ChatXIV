import { logger } from '../observability/logger.js';
import type { ResolvedCacheBackend } from '../config/cacheConfig.js';

let activeBackend: ResolvedCacheBackend = 'memory';
let healthy = true;
let lastLoggedUnhealthy = false;

export function setActiveCacheBackend(backend: ResolvedCacheBackend): void {
  activeBackend = backend;
  healthy = true;
  lastLoggedUnhealthy = false;
}

export function isRedisCacheBackend(): boolean {
  return activeBackend === 'redis';
}

export function isCacheHealthy(): boolean {
  if (!isRedisCacheBackend()) return true;
  return healthy;
}

export function reportCacheSuccess(): void {
  if (!isRedisCacheBackend()) return;
  if (!healthy) {
    logger.info('Cache backend recovered');
    lastLoggedUnhealthy = false;
  }
  healthy = true;
}

export function reportCacheFailure(err: unknown): void {
  if (!isRedisCacheBackend()) return;
  if (healthy || !lastLoggedUnhealthy) {
    logger.error({ err }, 'Cache backend unavailable');
    lastLoggedUnhealthy = true;
  }
  healthy = false;
}

export function markCacheUnhealthyFromProbe(err: unknown): void {
  reportCacheFailure(err);
}

export interface CacheReadinessCheck {
  readonly ok: boolean;
  readonly backend: ResolvedCacheBackend;
  readonly message?: string;
}

export function getCacheReadinessCheck(): CacheReadinessCheck {
  if (!isRedisCacheBackend()) {
    return { ok: true, backend: activeBackend };
  }
  if (healthy) {
    return { ok: true, backend: activeBackend };
  }
  return {
    ok: false,
    backend: activeBackend,
    message: 'Redis cache is unavailable',
  };
}
