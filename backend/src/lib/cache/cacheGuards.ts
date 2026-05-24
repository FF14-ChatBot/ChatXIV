import { AppError } from '../errors/AppError.js';
import { CacheGetOutcome, type CacheGetResult } from './cacheGetResult.js';
import { isCacheHealthy } from './cacheHealth.js';

const CACHE_UNAVAILABLE_MESSAGE = 'Data sources temporarily unavailable; try again shortly.';

/**
 * Throws 503 SOURCE_UNAVAILABLE when the cache store is down (Redis unhealthy).
 * Call before origin fetches that must not run during a cache outage.
 */
export function requireCacheHealthy(): void {
  if (!isCacheHealthy()) {
    throw AppError.sourceUnavailable(CACHE_UNAVAILABLE_MESSAGE);
  }
}

/**
 * Throws 503 when a `get` returned unavailable. Use on miss before calling external APIs.
 */
export function throwIfCacheUnavailable<T>(result: CacheGetResult<T>): void {
  if (result.outcome === CacheGetOutcome.Unavailable) {
    throw AppError.sourceUnavailable(CACHE_UNAVAILABLE_MESSAGE);
  }
}
