import type pino from 'pino';

export interface TokenBucket {
  /** Optional structured fields for logs (e.g. `url` from the outbound HTTP request). */
  consume(meta?: Readonly<Record<string, unknown>>): Promise<void>;
}

export function createTokenBucket(
  ratePerSecond: number,
  burstCapacity: number = ratePerSecond,
  log?: pino.Logger
): TokenBucket {
  let tokens = burstCapacity;
  let lastRefill = Date.now();

  function refill(): void {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1_000;
    tokens = Math.min(burstCapacity, tokens + elapsed * ratePerSecond);
    lastRefill = now;
  }

  function consume(meta?: Readonly<Record<string, unknown>>): Promise<void> {
    refill();

    if (tokens >= 1) {
      tokens -= 1;
      return Promise.resolve();
    }

    const waitMs = ((1 - tokens) / ratePerSecond) * 1_000;
    if (log) {
      log.warn(
        {
          waitMs,
          tokens,
          ratePerSecond,
          burstCapacity,
          ...meta,
        },
        'Token bucket empty; awaiting token refill'
      );
    }
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
