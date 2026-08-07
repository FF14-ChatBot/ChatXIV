import type pino from 'pino';

export interface TokenBucket {
  /**
   * @param meta Optional structured fields for logs (e.g. `url` from the outbound HTTP request).
   * @param signal When provided and it aborts while this call is queued waiting for a token, the
   *   wait is cancelled immediately and the waiter is removed from the queue -- instead of
   *   lingering un-cancelled after the caller has already given up (DEV-59), which would let an
   *   HTTP call fire later for a request nobody is waiting on anymore.
   */
  consume(meta?: Readonly<Record<string, unknown>>, signal?: AbortSignal): Promise<void>;
}

interface Waiter {
  readonly resolve: () => void;
  readonly meta: Readonly<Record<string, unknown>> | undefined;
}

export function createTokenBucket(
  ratePerSecond: number,
  burstCapacity: number = ratePerSecond,
  log?: pino.Logger,
  /**
   * Caps how long a single `consume()` call will queue for a token before giving up. Optional
   * and unset by default (unbounded wait, the original behavior) -- callers whose upstream has
   * no published rate limit to calibrate against (e.g. XIVAPI) have no reason to fail fast here.
   * MediaWiki's rate limiter sets this (DEV-59): without it, a queue wait has no ceiling of its
   * own and silently consumes the caller's entire retrieval budget with no distinguishable error
   * -- see `Token bucket queue wait exceeded` below vs. a generic abort/timeout.
   */
  maxQueueWaitMs?: number
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

  function consume(meta?: Readonly<Record<string, unknown>>, signal?: AbortSignal): Promise<void> {
    refill();

    // The `queue.length === 0` check preserves FIFO order: a request that arrives while
    // others are already queued must wait its turn even if refill briefly made a token
    // available, instead of jumping ahead of earlier waiters.
    if (tokens >= 1 && queue.length === 0) {
      tokens -= 1;
      return Promise.resolve();
    }

    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }

    return new Promise<void>((resolve, reject) => {
      // `onAbort`/`queueTimeoutTimer` are declared before `waiter` so `wrappedResolve` can
      // reference them in its closure; both are only ever invoked later (from `scheduleDrain`
      // or the queue-timeout timer, after this constructor returns), by which point they're
      // always assigned when applicable.
      let onAbort: (() => void) | undefined;
      let queueTimeoutTimer: ReturnType<typeof setTimeout> | undefined;

      // Shared by every exit path (granted, aborted, queue-timeout) so exactly one of them can
      // ever fire -- without this, e.g. the queue-timeout could still fire after a token was
      // already granted moments earlier, spuriously rejecting an already-resolved caller.
      const cleanup = (): void => {
        if (onAbort !== undefined) {
          signal?.removeEventListener('abort', onAbort);
        }
        if (queueTimeoutTimer !== undefined) {
          clearTimeout(queueTimeoutTimer);
        }
      };
      const removeFromQueue = (): void => {
        const idx = queue.indexOf(waiter);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
      };

      const wrappedResolve = (): void => {
        cleanup();
        resolve();
      };
      const waiter: Waiter = { resolve: wrappedResolve, meta };
      queue.push(waiter);

      if (signal) {
        onAbort = () => {
          cleanup();
          removeFromQueue();
          reject(signal.reason as Error);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      if (maxQueueWaitMs !== undefined) {
        queueTimeoutTimer = setTimeout(() => {
          cleanup();
          removeFromQueue();
          if (log) {
            log.warn(
              { maxQueueWaitMs, tokens, ratePerSecond, burstCapacity, ...meta },
              "Token bucket queue wait exceeded cap; giving up rather than eating the caller's full budget"
            );
          }
          reject(new Error(`Token bucket queue wait exceeded ${maxQueueWaitMs}ms`));
        }, maxQueueWaitMs);
      }

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
