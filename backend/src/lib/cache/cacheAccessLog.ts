import { logger } from '../observability/logger.js';

export function logCacheHit(key: string): void {
  logger.debug({ key }, 'Cache hit');
}

export function logCacheMiss(key: string): void {
  logger.debug({ key }, 'Cache miss');
}

export function logCacheUnavailable(key: string, err: unknown): void {
  logger.debug({ err, key }, 'Cache unavailable');
}
