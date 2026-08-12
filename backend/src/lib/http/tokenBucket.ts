import type pino from 'pino';
import type { OnQueueWait } from './fetchWithRetry.js';

/**
 * Thrown when a `consume()` call's queue wait exceeds `maxQueueWaitMs` (DEV-59). Distinct from
 * an abort-driven rejection (`signal.reason`) so callers can `instanceof`-check it specifically
 * and normalize it into a source-specific `AppError`, the way `connect()`/`sleep()` already do
 * for their own failure modes -- a raw `Error` here would bypass `instanceof AppError` checks
 * downstream (e.g. `knowledgeService.ts`'s `pickSourceUnavailableFailure`), losing this specific
 * diagnostic in favor of a generic fallback message.
 */
export class TokenBucketQueueTimeoutError extends Error {
  constructor(maxQueueWaitMs: number) {
    super(`Token bucket queue wait exceeded ${maxQueueWaitMs}ms`);
    this.name = 'TokenBucketQueueTimeoutError';
  }
}

export interface TokenBucket {
  /**
   * @param meta Optional structured fields for logs (e.g. `url` from the outbound HTTP request).
   * @param signal When provided and it aborts while this call is queued waiting for a token, the
   *   wait is cancelled immediately and the waiter is removed from the queue -- instead of
   *   lingering un-cancelled after the caller has already given up (DEV-59), which would let an
   *   HTTP call fire later for a request nobody is waiting on anymore.
   * @param onQueueWait Reports how long this call actually waited for a token. Called only when
   *   the call genuinely queued (never for an immediate grant) -- the bucket is the one place
   *   that already knows which case applies, so callers don't need to time it themselves.
   */
  consume(
    meta?: Readonly<Record<string, unknown>>,
    signal?: AbortSignal,
    onQueueWait?: OnQueueWait
  ): Promise<void>;
}

interface Waiter {
  readonly resolve: () => void;
  readonly rejectTimeout: () => void;
  readonly meta: Readonly<Record<string, unknown>> | undefined;
  readonly enqueuedAt: number;
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
   * own and silently consumes the caller's entire retrieval budget with no distinguishable error.
   */
  maxQueueWaitMs?: number
): TokenBucket {
  let tokens = burstCapacity;
  let lastRefill = Date.now();
  let drainTimer: ReturnType<typeof setTimeout> | undefined;
  /** FIFO — waiters are granted tokens (or evicted on timeout) in arrival order. */
  const queue: Waiter[] = [];

  function refill(): void {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1_000;
    tokens = Math.min(burstCapacity, tokens + elapsed * ratePerSecond);
    lastRefill = now;
  }

  function consume(
    meta?: Readonly<Record<string, unknown>>,
    signal?: AbortSignal,
    onQueueWait?: OnQueueWait
  ): Promise<void> {
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

    const enqueuedAt = Date.now();

    return new Promise<void>((resolve, reject) => {
      let onAbort: (() => void) | undefined;

      const removeFromQueue = (): void => {
        const idx = queue.indexOf(waiter);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
      };

      const wrappedResolve = (): void => {
        if (onAbort !== undefined) {
          signal?.removeEventListener('abort', onAbort);
        }
        onQueueWait?.(Date.now() - enqueuedAt);
        resolve();
      };
      const rejectTimeout = (): void => {
        if (onAbort !== undefined) {
          signal?.removeEventListener('abort', onAbort);
        }
        if (log) {
          log.warn(
            { maxQueueWaitMs, tokens, ratePerSecond, burstCapacity, ...meta },
            "Token bucket queue wait exceeded cap; giving up rather than eating the caller's full budget"
          );
        }
        // `maxQueueWaitMs` is always defined here -- `rejectTimeout` is only ever installed as a
        // reachable exit path (via `evictExpiredWaiters`) when it's set; see `scheduleDrain`.
        reject(new TokenBucketQueueTimeoutError(maxQueueWaitMs as number));
      };
      const waiter: Waiter = { resolve: wrappedResolve, rejectTimeout, meta, enqueuedAt };
      queue.push(waiter);

      if (signal) {
        onAbort = () => {
          removeFromQueue();
          reject(signal.reason as Error);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      scheduleDrain();
    });
  }

  /**
   * Evicts (from the front) any waiter whose queue wait has already reached `maxQueueWaitMs` as
   * of `now`. FIFO means the front waiter has been queued longest, so once it hasn't expired,
   * nothing behind it can have either.
   */
  function evictExpiredWaiters(now: number): void {
    if (maxQueueWaitMs === undefined) return;
    while (queue.length > 0 && now - queue[0].enqueuedAt >= maxQueueWaitMs) {
      queue.shift()?.rejectTimeout();
    }
  }

  /**
   * Schedules a single timer to drain the queue — never more than one in flight. Without
   * this, every concurrent waiter would independently compute the same `waitMs` from the same
   * stale `tokens` value and schedule its own timer, so all of them would wake in lockstep,
   * only one would find a token, and the rest would collide again on the next round (a
   * thundering herd that costs O(n²) wakeups to drain n queued requests instead of O(n)).
   *
   * The same shared timer also covers the queue-timeout deadline (DEV-59) -- it wakes at
   * whichever comes first, the next refill or the front waiter's `maxQueueWaitMs` deadline --
   * rather than each waiter owning a second, independent `setTimeout` layered on top of this
   * one, which would double timer-registration/cleanup churn per queued request for no behavior
   * this single shared timer can't already provide.
   */
  function scheduleDrain(): void {
    if (drainTimer !== undefined) return;

    const now = Date.now();
    evictExpiredWaiters(now);
    if (queue.length === 0) return;

    const refillWaitMs = Math.max(0, ((1 - tokens) / ratePerSecond) * 1_000);
    const timeoutWaitMs =
      maxQueueWaitMs !== undefined
        ? Math.max(0, maxQueueWaitMs - (now - queue[0].enqueuedAt))
        : undefined;
    const waitMs =
      timeoutWaitMs !== undefined ? Math.min(refillWaitMs, timeoutWaitMs) : refillWaitMs;

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
      // Evict anyone who has already reached the cap *before* granting -- otherwise a waiter
      // whose deadline is exactly what woke this timer could still win a token in the loop
      // below (if refill happens to produce one on the same tick), while another waiter with
      // the identical wait duration gets timed out purely because of loop order, not because
      // it waited any longer.
      evictExpiredWaiters(Date.now());
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
