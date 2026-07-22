import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@chatxiv/cdm';
import { AppError } from '@src/lib/errors/AppError.js';
import { cacheMiss, cacheUnavailable } from '@src/lib/cache/cacheGetResult.js';
import { throwIfCacheUnavailable } from '@src/lib/cache/cacheGuards.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';

const xivapi = { dataSource: 'XIVAPI' } as const;

describe('cacheGuards', () => {
  it('throwIfCacheUnavailable throws 503 with data source and cache error reason', () => {
    expect(() =>
      throwIfCacheUnavailable(cacheUnavailable(new Error('redis down')), xivapi)
    ).toThrow(AppError);
    try {
      throwIfCacheUnavailable(cacheUnavailable(new Error('redis down')), xivapi);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.status).toBe(503);
      expect(appErr.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
      expect(appErr.message).toContain('XIVAPI');
      expect(appErr.message).toContain('application cache failed');
      expect(appErr.message).toContain('redis down');
    }
  });

  it('throwIfCacheUnavailable falls back to last cache failure when cause is omitted', () => {
    cacheBackendHealth.configure('redis');
    cacheBackendHealth.recordOperationFailure(new Error('probe failed'));
    try {
      throwIfCacheUnavailable(cacheUnavailable(), xivapi);
    } catch (err) {
      expect((err as AppError).message).toContain('probe failed');
    }
    cacheBackendHealth.configure('memory');
  });

  it('throwIfCacheUnavailable ignores cache miss', () => {
    expect(() => throwIfCacheUnavailable(cacheMiss(), xivapi)).not.toThrow();
  });
});
