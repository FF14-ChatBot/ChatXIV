/**
 * In-process token-bucket rate limiter for outbound XIVAPI requests.
 *
 * Ensures a single backend instance stays under XIVAPI's per-IP rate cap.
 * The bucket refills continuously based on elapsed wall-clock time; when empty,
 * `consume()` returns a promise that resolves once a token becomes available.
 *
 * Multi-instance shared limiting (e.g. Redis) is out of scope for MVP.
 */

export interface TokenBucket {
  /** Waits until a token is available, then consumes one. */
  consume(): Promise<void>;
}

/**
 * Creates a token bucket that allows `tokensPerSecond` requests per second.
 * Burst capacity equals one full second of tokens.
 */
export function createTokenBucket(tokensPerSecond: number): TokenBucket {
  let tokens = tokensPerSecond;
  let lastRefill = Date.now();

  function refill(): void {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1_000;
    tokens = Math.min(tokensPerSecond, tokens + elapsed * tokensPerSecond);
    lastRefill = now;
  }

  function consume(): Promise<void> {
    refill();

    if (tokens >= 1) {
      tokens -= 1;
      return Promise.resolve();
    }

    const waitMs = ((1 - tokens) / tokensPerSecond) * 1_000;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        refill();
        tokens = Math.max(0, tokens - 1);
        resolve();
      }, waitMs);
    });
  }

  return { consume };
}
