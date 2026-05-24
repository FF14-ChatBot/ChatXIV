import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@chatxiv/cdm';
import { AppError } from '@src/lib/errors/AppError.js';
import { cacheMiss, cacheUnavailable } from '@src/lib/cache/cacheGetResult.js';
import { throwIfCacheUnavailable, requireCacheHealthy } from '@src/lib/cache/cacheGuards.js';
import { reportCacheFailure, setActiveCacheBackend } from '@src/lib/cache/cacheHealth.js';

describe('cacheGuards', () => {
  it('throwIfCacheUnavailable throws 503 SOURCE_UNAVAILABLE', () => {
    expect(() => throwIfCacheUnavailable(cacheUnavailable(new Error('redis down')))).toThrow(
      AppError
    );
    try {
      throwIfCacheUnavailable(cacheUnavailable());
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(503);
      expect(appErr.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
    }
  });

  it('requireCacheHealthy passes for memory backend', () => {
    setActiveCacheBackend('memory');
    expect(() => requireCacheHealthy()).not.toThrow();
  });

  it('throwIfCacheUnavailable ignores cache miss', () => {
    expect(() => throwIfCacheUnavailable(cacheMiss())).not.toThrow();
  });

  it('requireCacheHealthy throws when Redis backend is unhealthy', () => {
    setActiveCacheBackend('redis');
    reportCacheFailure(new Error('down'));
    expect(() => requireCacheHealthy()).toThrow(AppError);
    setActiveCacheBackend('memory');
  });
});
