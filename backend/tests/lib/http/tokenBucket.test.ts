import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type pino from 'pino';
import { createTokenBucket } from '@src/lib/http/tokenBucket.js';

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
