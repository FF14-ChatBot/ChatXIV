import type pino from 'pino';
import { createTokenBucket, type TokenBucket } from '../http/tokenBucket.js';
import type { MediaWikiWikiId } from '../config/constants.js';

/**
 * One token bucket per wiki so a slow/limited wiki cannot starve requests to another (TR-8).
 */
export interface MediaWikiRateLimiter {
  forWiki(wikiId: MediaWikiWikiId): TokenBucket;
}

export function createMediaWikiRateLimiter(
  ratePerSecond: number,
  log?: pino.Logger,
  /** Caps a single queued request's wait before it fails fast instead of eating the caller's
   *  overall retrieval budget with no distinguishable error (DEV-59). */
  maxQueueWaitMs?: number
): MediaWikiRateLimiter {
  const buckets = new Map<MediaWikiWikiId, TokenBucket>();

  return {
    forWiki(wikiId: MediaWikiWikiId): TokenBucket {
      const existing = buckets.get(wikiId);
      if (existing) return existing;

      const bucket = createTokenBucket(ratePerSecond, ratePerSecond, log, maxQueueWaitMs);
      buckets.set(wikiId, bucket);
      return bucket;
    },
  };
}
