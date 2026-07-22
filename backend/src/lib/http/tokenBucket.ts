import type pino from 'pino';

export interface TokenBucket {
  /** Optional structured fields for logs (e.g. `url` from the outbound HTTP request). */
  consume(meta?: Readonly<Record<string, unknown>>): Promise<void>;
}

interface Waiter {
  readonly resolve: () => void;
  readonly meta: Readonly<Record<string, unknown>> | undefined;
}

export function createTokenBucket(
  ratePerSecond: number,
  burstCapacity: number = ratePerSecond,
  log?: pino.Logger
): TokenBucket {
  let tokens = burstCapacity;
  let lastRefill = Date.now();
  let drainTimer: ReturnType<typeof setTimeout> | undefined;
  /** FIFO — waiters are granted tokens in arrival order as refills make them available. */
  const queue: Waiter[] = [];

  function refill(): void {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1_000;
    tokens = Math.min(burstCapacity, tokens + elapsed * ratePerSecond);
    lastRefill = now;
  }

  function consume(meta?: Readonly<Record<string, unknown>>): Promise<void> {
    refill();

    // The `queue.length === 0` check preserves FIFO order: a request that arrives while
    // others are already queued must wait its turn even if refill briefly made a token
    // available, instead of jumping ahead of earlier waiters.
    if (tokens >= 1 && queue.length === 0) {
      tokens -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      queue.push({ resolve, meta });
      scheduleDrain();
    });
  }

  /**
   * Schedules a single timer to drain the queue — never more than one in flight. Without
   * this, every concurrent waiter would independently compute the same `waitMs` from the same
   * stale `tokens` value and schedule its own timer, so all of them would wake in lockstep,
   * only one would find a token, and the rest would collide again on the next round (a
   * thundering herd that costs O(n²) wakeups to drain n queued requests instead of O(n)).
   */
  function scheduleDrain(): void {
    if (drainTimer !== undefined || queue.length === 0) return;

    const waitMs = Math.max(0, ((1 - tokens) / ratePerSecond) * 1_000);
    if (log) {
      log.warn(
        {
          waitMs,
          tokens,
          ratePerSecond,
          burstCapacity,
          ...queue[0]?.meta,
        },
        'Token bucket empty; awaiting token refill'
      );
    }

    drainTimer = setTimeout(() => {
      drainTimer = undefined;
      refill();
      while (tokens >= 1 && queue.length > 0) {
        tokens -= 1;
        queue.shift()?.resolve();
      }
      scheduleDrain();
    }, waitMs);
  }

  return { consume };
}
