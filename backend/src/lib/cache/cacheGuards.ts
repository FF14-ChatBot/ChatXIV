import { AppError } from '../errors/AppError.js';
import { CacheGetOutcome, type CacheGetResult } from './cacheGetResult.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';

export type CacheUnavailableContext = Readonly<{
  /** Upstream origin that would be fetched on cache miss (e.g. XIVAPI, MediaWiki). */
  dataSource: string;
}>;

/**
 * Throws 503 SOURCE_UNAVAILABLE when the cache store is down (Redis unhealthy).
 * Call before origin fetches that must not run during a cache outage.
 */
export function requireCacheHealthy(context: CacheUnavailableContext): void {
  if (!cacheBackendHealth.isHealthy()) {
    const lastFailure = cacheBackendHealth.getLastFailure();
    const reason =
      lastFailure !== undefined && lastFailure.message.trim() !== ''
        ? lastFailure.message
        : 'cache backend is unavailable';
    throw AppError.sourceUnavailable(
      `Unable to load data from ${context.dataSource}: application cache failed (${reason})`
    );
  }
}

/**
 * Throws 503 when a `get` returned unavailable. Use on miss before calling external APIs.
 */
export function throwIfCacheUnavailable<T>(
  result: CacheGetResult<T>,
  context: CacheUnavailableContext
): void {
  if (result.outcome !== CacheGetOutcome.Unavailable) {
    return;
  }

  if (result.cause instanceof Error && result.cause.message.trim() !== '') {
    throw AppError.sourceUnavailable(
      `Unable to load data from ${context.dataSource}: application cache failed (${result.cause.message})`
    );
  }

  const lastFailure = cacheBackendHealth.getLastFailure();
  if (lastFailure !== undefined && lastFailure.message.trim() !== '') {
    throw AppError.sourceUnavailable(
      `Unable to load data from ${context.dataSource}: application cache failed (${lastFailure.message})`
    );
  }

  throw AppError.sourceUnavailable(
    `Unable to load data from ${context.dataSource}: application cache failed (cache backend is unavailable)`
  );
}
