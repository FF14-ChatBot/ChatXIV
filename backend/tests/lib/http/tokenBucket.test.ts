import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type pino from 'pino';
import { createTokenBucket, TokenBucketQueueTimeoutError } from '@src/lib/http/tokenBucket.js';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

describe('lib/http/tokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when tokens are available', async () => {
    const bucket = createTokenBucket(10);
    await expect(bucket.consume()).resolves.toBeUndefined();
  });

  it('allows burst up to ratePerSecond without delay when burst equals rate', async () => {
    const bucket = createTokenBucket(5);
    for (let i = 0; i < 5; i++) {
      await expect(bucket.consume()).resolves.toBeUndefined();
    }
  });

  it('allows burst up to explicit burst capacity', async () => {
    const bucket = createTokenBucket(5, 10);
    for (let i = 0; i < 10; i++) {
      await expect(bucket.consume()).resolves.toBeUndefined();
    }
  });

  it('delays when tokens are exhausted', async () => {
    const bucket = createTokenBucket(2);

    await bucket.consume();
    await bucket.consume();

    let resolved = false;
    const pending = bucket.consume().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    await pending;

    expect(resolved).toBe(true);
  });

  it('refills tokens over time', async () => {
    const bucket = createTokenBucket(5);

    for (let i = 0; i < 5; i++) {
      await bucket.consume();
    }

    vi.advanceTimersByTime(1_000);

    for (let i = 0; i < 5; i++) {
      await expect(bucket.consume()).resolves.toBeUndefined();
    }
  });

  it('caps tokens at bucket capacity', async () => {
    const bucket = createTokenBucket(3);

    vi.advanceTimersByTime(5_000);

    await bucket.consume();
    await bucket.consume();
    await bucket.consume();

    let resolved = false;
    const pending = bucket.consume().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(334);
    await pending;

    expect(resolved).toBe(true);
  });

  it('spaces out concurrent waiters instead of releasing them all at the same wake-up', async () => {
    const bucket = createTokenBucket(1, 1);

    await bucket.consume(); // takes the only token immediately

    let secondResolved = false;
    let thirdResolved = false;
    const second = bucket.consume().then(() => {
      secondResolved = true;
    });
    const third = bucket.consume().then(() => {
      thirdResolved = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(secondResolved).toBe(false);
    expect(thirdResolved).toBe(false);

    // Both waiters' timers fire around t=1000ms; only one token is available.
    await vi.advanceTimersByTimeAsync(1);
    expect(secondResolved).toBe(true);
    expect(thirdResolved).toBe(false); // must reschedule, not force through with the rest

    await vi.advanceTimersByTimeAsync(1_000);
    await third;
    expect(thirdResolved).toBe(true);

    await second;
  });

  it('schedules only one drain timer for many concurrent waiters (regression: thundering herd)', async () => {
    const bucket = createTokenBucket(1, 1);

    await bucket.consume(); // takes the only token immediately

    const resolutions: number[] = [];
    const waiters = Array.from({ length: 5 }, (_, i) =>
      bucket.consume().then(() => resolutions.push(i))
    );

    // All 5 waiters are queued behind a single token bucket refilling at 1/s — only one
    // timer should be scheduled at a time, not one per waiter.
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(5_000);
    await Promise.all(waiters);

    expect(resolutions).toEqual([0, 1, 2, 3, 4]);
  });

  it('rejects immediately without queueing when the signal is already aborted', async () => {
    const bucket = createTokenBucket(1);
    await bucket.consume(); // exhaust the only token

    const controller = new AbortController();
    const reason = new Error('already gone');
    controller.abort(reason);

    await expect(bucket.consume(undefined, controller.signal)).rejects.toBe(reason);
    // Nothing should be queued -- advancing time must not resolve or throw from a phantom waiter.
    await vi.advanceTimersByTimeAsync(2_000);
  });

  it('cancels a queued wait when its signal aborts, without disturbing other waiters (DEV-59)', async () => {
    const bucket = createTokenBucket(1, 1);
    await bucket.consume(); // takes the only token immediately

    const controller = new AbortController();
    const reason = new Error('caller gave up');
    let firstRejected: unknown;
    const first = bucket.consume(undefined, controller.signal).catch((err: unknown) => {
      firstRejected = err;
    });

    let secondResolved = false;
    const second = bucket.consume().then(() => {
      secondResolved = true;
    });

    // Abort the first waiter well before its token would have arrived.
    await vi.advanceTimersByTimeAsync(200);
    controller.abort(reason);
    await first;
    expect(firstRejected).toBe(reason);

    // The second waiter, still queued, must still be served on its own turn -- the aborted
    // waiter's removal from the queue must not leave the FIFO order or drain scheduling broken.
    expect(secondResolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    await second;
    expect(secondResolved).toBe(true);
  });

  it('does not reject or leak a listener once a signal-bearing wait resolves normally', async () => {
    const bucket = createTokenBucket(1, 1);
    await bucket.consume();

    const controller = new AbortController();
    const pending = bucket.consume(undefined, controller.signal);

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeUndefined();

    // Aborting after the wait already resolved must be a no-op -- no unhandled rejection, no
    // effect on a since-reused queue.
    expect(() => controller.abort(new Error('too late'))).not.toThrow();
  });

  it('rejects distinctly when a queue wait exceeds maxQueueWaitMs, instead of eating the caller budget silently (DEV-59)', async () => {
    const bucket = createTokenBucket(1, 1, undefined, 500);
    await bucket.consume(); // takes the only token immediately; next refill is 1000ms out

    let rejected: unknown;
    const pending = bucket.consume().catch((err: unknown) => {
      rejected = err;
    });

    await vi.advanceTimersByTimeAsync(500);
    await pending;

    expect(rejected).toBeInstanceOf(TokenBucketQueueTimeoutError);
    expect((rejected as Error).message).toContain('500ms');
  });

  it('does not fire the queue-timeout when a token arrives before the cap', async () => {
    const bucket = createTokenBucket(2, 2, undefined, 5_000);
    await bucket.consume();
    await bucket.consume();

    let resolved = false;
    const pending = bucket.consume().then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(500); // well under the 5s cap, refill is at ~500ms for rate=2
    await pending;
    expect(resolved).toBe(true);
  });

  it('removes a timed-out waiter from the queue without corrupting it for a waiter queued afterward', async () => {
    // maxQueueWaitMs applies bucket-wide (not per-call, unlike `signal`) -- two waiters queued
    // at the same instant would hit the same deadline together, so this verifies queue integrity
    // via a waiter added *after* the timed-out one has already been spliced out, not a waiter
    // racing the same cap.
    const bucket = createTokenBucket(1, 1, undefined, 300);
    await bucket.consume(); // takes the only token immediately; refill due at t=1000

    let firstRejected: unknown;
    const first = bucket.consume().catch((err: unknown) => {
      firstRejected = err;
    });

    await vi.advanceTimersByTimeAsync(300);
    await first;
    expect(firstRejected).toBeInstanceOf(Error);

    // Advance past the refill (due at t=1000) *before* queuing a second waiter, so it lands on
    // the immediate-grant fast path instead of queueing again -- isolating this test to whether
    // the first waiter's removal corrupted the queue/drain bookkeeping for what comes next,
    // independent of maxQueueWaitMs applying to a second queued wait too.
    await vi.advanceTimersByTimeAsync(700); // absolute t=1000
    let secondResolved = false;
    await bucket.consume().then(() => {
      secondResolved = true;
    });
    expect(secondResolved).toBe(true);
  });

  it("gives a later-arriving waiter its own independent cap window, not the earlier waiter's deadline", async () => {
    const bucket = createTokenBucket(1, 1, undefined, 300);
    await bucket.consume(); // takes the only token immediately; refill due at t=1000

    let firstRejected: unknown;
    const first = bucket.consume().catch((err: unknown) => {
      firstRejected = err;
    });

    await vi.advanceTimersByTimeAsync(100);
    let secondRejected: unknown;
    const second = bucket.consume().catch((err: unknown) => {
      secondRejected = err;
    });

    // First's cap (300ms from its own t=0) fires now; second's own cap (300ms from t=100) has
    // not yet elapsed -- it must not be dragged down by the first waiter's deadline.
    await vi.advanceTimersByTimeAsync(200); // absolute t=300
    await first;
    expect(firstRejected).toBeInstanceOf(Error);
    expect(secondRejected).toBeUndefined();

    await vi.advanceTimersByTimeAsync(100); // absolute t=400, second's own cap now elapsed
    await second;
    expect(secondRejected).toBeInstanceOf(Error);
  });

  it('does not fire the queue-timeout after a signal-driven abort already settled the wait', async () => {
    const bucket = createTokenBucket(1, 1, undefined, 1_000);
    await bucket.consume();

    const controller = new AbortController();
    const reason = new Error('caller gave up first');
    let rejected: unknown;
    const pending = bucket.consume(undefined, controller.signal).catch((err: unknown) => {
      rejected = err;
    });

    await vi.advanceTimersByTimeAsync(200);
    controller.abort(reason);
    await pending;
    expect(rejected).toBe(reason);

    // If the queue-timeout timer weren't cleared on abort, it would still be live here and
    // attempting to act on an already-removed waiter -- advancing past its own deadline must be
    // a silent no-op (no unhandled rejection, no throw).
    await vi.advanceTimersByTimeAsync(1_000);
  });

  it('does not fire the queue-timeout after the wait already resolved normally', async () => {
    const bucket = createTokenBucket(1, 1, undefined, 5_000);
    await bucket.consume();

    const pending = bucket.consume();
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeUndefined();

    // The queue-timeout timer must have been cleared on grant -- advancing well past its
    // original deadline must not cause any further effect.
    await vi.advanceTimersByTimeAsync(5_000);
  });

  it('logs a distinct message when the queue-timeout fires and a logger is configured', async () => {
    const log = createMockLogger();
    const bucket = createTokenBucket(1, 1, log, 400);
    await bucket.consume();

    const pending = bucket.consume({ url: 'https://example.com/x' }).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(400);
    await pending;

    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ maxQueueWaitMs: 400, url: 'https://example.com/x' }),
      expect.stringContaining('Token bucket queue wait exceeded cap')
    );
  });

  it('does not call onQueueWait for an immediate grant (DEV-59)', async () => {
    const bucket = createTokenBucket(10);
    const onQueueWait = vi.fn();

    await bucket.consume(undefined, undefined, onQueueWait);

    expect(onQueueWait).not.toHaveBeenCalled();
  });

  it('calls onQueueWait with the actual wait duration once a queued call is granted (DEV-59)', async () => {
    const bucket = createTokenBucket(1, 1);
    await bucket.consume(); // takes the only token; next refill is 1000ms out

    const onQueueWait = vi.fn();
    const pending = bucket.consume(undefined, undefined, onQueueWait);

    await vi.advanceTimersByTimeAsync(1_000);
    await pending;

    expect(onQueueWait).toHaveBeenCalledTimes(1);
    expect(onQueueWait).toHaveBeenCalledWith(expect.any(Number));
    expect(onQueueWait.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(1_000);
  });

  it('does not call onQueueWait when the wait ends in a queue-timeout instead of a grant', async () => {
    const bucket = createTokenBucket(1, 1, undefined, 300);
    await bucket.consume();

    const onQueueWait = vi.fn();
    const pending = bucket.consume(undefined, undefined, onQueueWait).catch(() => undefined);

    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(onQueueWait).not.toHaveBeenCalled();
  });

  it('uses only one live timer even with a queue-timeout cap and multiple queued waiters (DEV-59: no second per-waiter timer)', async () => {
    const bucket = createTokenBucket(1, 1, undefined, 5_000);
    await bucket.consume(); // takes the only token immediately

    const waiters = Array.from({ length: 4 }, () => bucket.consume().catch(() => undefined));

    // Four waiters queued behind a capped bucket -- a per-waiter queue-timeout timer alongside
    // the existing drain timer would show 5 live timers here; folding the cap into the shared
    // drain tick keeps it at 1 regardless of queue depth.
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(5_000);
    await Promise.all(waiters);
  });

  it('warns when empty and a logger is configured', async () => {
    const log = createMockLogger();
    const bucket = createTokenBucket(2, 2, log);

    await bucket.consume();
    await bucket.consume();

    const pending = bucket.consume({ url: 'https://example.com/x' });

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        waitMs: expect.any(Number),
        tokens: expect.any(Number),
        ratePerSecond: 2,
        burstCapacity: 2,
        url: 'https://example.com/x',
      }),
      'Token bucket empty; awaiting token refill'
    );

    await vi.advanceTimersByTimeAsync(500);
    await pending;
  });
});
