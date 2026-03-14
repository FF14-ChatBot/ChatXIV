import type { RateLimitConfig, RateLimitResult, RateLimitStore } from './types.js';

interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

/**
 * In-memory token bucket store.
 *
 * Semantics: bucket holds up to `capacity` tokens. Each request consumes 1 token.
 * Tokens refill at `refillPerMin` per minute (e.g. 2/min → 1 token every 30s).
 * So limits are a burst of up to `capacity` requests, then a sustained rate of
 * `refillPerMin` requests per minute — not "capacity total per N minutes".
 *
 * Keys are never evicted (MVP); add TTL eviction later if needed.
 */
export function createMemoryStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>();

  return {
    consume(key: string, config: RateLimitConfig): RateLimitResult {
      const now = Date.now();
      const msPerToken = 60_000 / config.refillPerMin;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: config.capacity - 1, lastRefillAt: now };
        buckets.set(key, bucket);
        return { allowed: true };
      }
      const elapsed = (now - bucket.lastRefillAt) / 1000;
      const refill = (elapsed / 60) * config.refillPerMin;
      bucket.tokens = Math.min(config.capacity, bucket.tokens + refill);
      bucket.lastRefillAt = now;
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true };
      }
      const secondsUntilNextToken = (1 - bucket.tokens) * (msPerToken / 1000);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(Math.max(1, secondsUntilNextToken)),
      };
    },
  };
}
