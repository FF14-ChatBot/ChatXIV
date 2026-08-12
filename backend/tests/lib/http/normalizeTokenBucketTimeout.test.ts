import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@chatxiv/cdm';
import { normalizeTokenBucketTimeout } from '@src/lib/http/normalizeTokenBucketTimeout.js';
import { TokenBucketQueueTimeoutError } from '@src/lib/http/tokenBucket.js';

describe('lib/http/normalizeTokenBucketTimeout', () => {
  it('normalizes a TokenBucketQueueTimeoutError into AppError.sourceUnavailable', () => {
    expect(() =>
      normalizeTokenBucketTimeout(new TokenBucketQueueTimeoutError(4_000), 'XIVAPI')
    ).toThrowError(
      expect.objectContaining({
        code: ERROR_CODES.SOURCE_UNAVAILABLE,
        message: expect.stringContaining('XIVAPI rate limiter'),
      })
    );
  });

  it('includes the original message so the specific cap that fired is not lost', () => {
    expect(() =>
      normalizeTokenBucketTimeout(new TokenBucketQueueTimeoutError(4_000), 'XIVAPI')
    ).toThrowError(expect.objectContaining({ message: expect.stringContaining('4000ms') }));
  });

  it('rethrows any other error unchanged', () => {
    const abortReason = new Error('caller gave up');
    expect(() => normalizeTokenBucketTimeout(abortReason, 'XIVAPI')).toThrow(abortReason);
  });
});
