import { AppError } from '../errors/AppError.js';
import { CacheGetOutcome, type CacheGetResult } from './cacheGetResult.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';

export type CacheUnavailableContext = Readonly<{
  /** Upstream origin that would be fetched on cache miss (e.g. XIVAPI, MediaWiki). */
  dataSource: string;
}>;

function formatCacheFailureReason(cause?: unknown): string {
  if (cause instanceof Error && cause.message.trim() !== '') {
    return cause.message;
  }
  const lastFailure = cacheBackendHealth.getLastFailure();
  if (lastFailure !== undefined && lastFailure.message.trim() !== '') {
    return lastFailure.message;
  }
  return 'cache backend is unavailable';
}

function buildCacheUnavailableMessage(dataSource: string, cause?: unknown): string {
  const reason = formatCacheFailureReason(cause);
  return `Unable to load data from ${dataSource}: application cache failed (${reason})`;
}

/**
 * Throws 503 SOURCE_UNAVAILABLE when the cache store is down (Redis unhealthy).
 * Call before origin fetches that must not run during a cache outage.
 */
export function requireCacheHealthy(context: CacheUnavailableContext): void {
  if (!cacheBackendHealth.isHealthy()) {
    throw AppError.sourceUnavailable(buildCacheUnavailableMessage(context.dataSource));
  }
}

/**
 * Throws 503 when a `get` returned unavailable. Use on miss before calling external APIs.
 */
export function throwIfCacheUnavailable<T>(
  result: CacheGetResult<T>,
  context: CacheUnavailableContext
): void {
  if (result.outcome === CacheGetOutcome.Unavailable) {
    throw AppError.sourceUnavailable(
      buildCacheUnavailableMessage(context.dataSource, result.cause)
    );
  }
}
