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
      // `onAbort` is declared before `waiter` so `wrappedResolve` can reference it in its
      // closure; it's only ever invoked later (from `scheduleDrain`, after this constructor
      // returns), by which point `onAbort` is always assigned when `signal` was provided.
      let onAbort: (() => void) | undefined;
      const wrappedResolve = (): void => {
        if (onAbort !== undefined) {
          signal?.removeEventListener('abort', onAbort);
        }
        resolve();
      };
      const waiter: Waiter = { resolve: wrappedResolve, meta };
      queue.push(waiter);

      if (signal) {
        onAbort = () => {
          const idx = queue.indexOf(waiter);
          if (idx !== -1) {
            queue.splice(idx, 1);
          }
          reject(signal.reason as Error);
        };
        signal.addEventListener('abort', onAbort, { once: true });
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
