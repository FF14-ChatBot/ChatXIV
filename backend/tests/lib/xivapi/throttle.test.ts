import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTokenBucket } from '@src/lib/xivapi/throttle.js';

describe('lib/xivapi/throttle', () => {
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

  it('allows burst up to tokensPerSecond without delay', async () => {
    const bucket = createTokenBucket(5);
    for (let i = 0; i < 5; i++) {
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
});
