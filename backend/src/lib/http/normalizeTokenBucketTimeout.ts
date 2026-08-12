import { AppError } from '../errors/AppError.js';
import { TokenBucketQueueTimeoutError } from './tokenBucket.js';

/**
 * Normalizes a `TokenBucketQueueTimeoutError` into `AppError.sourceUnavailable` so downstream
 * `instanceof AppError` checks (e.g. `pickSourceUnavailableFailure`) see it, the same way
 * `connect()`/`sleep()` already normalize their own failure modes -- a raw error here would
 * bypass those checks in favor of a generic fallback. Any other error is rethrown unchanged.
 *
 * Shared by every `RetryingHttpClient`'s `beforeAttempt` that consumes from a `TokenBucket`
 * (`mediawiki/client.ts`, `xivapi/XIVApiClient.ts`) so this normalization lives in one place
 * instead of being reimplemented per client.
 */
export function normalizeTokenBucketTimeout(err: unknown, sourceName: string): never {
  if (err instanceof TokenBucketQueueTimeoutError) {
    throw AppError.sourceUnavailable(`${sourceName} rate limiter: ${err.message}`);
  }
  throw err;
}
