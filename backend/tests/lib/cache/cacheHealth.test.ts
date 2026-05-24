import { describe, it, expect } from 'vitest';
import {
  getCacheReadinessCheck,
  reportCacheFailure,
  reportCacheSuccess,
  setActiveCacheBackend,
} from '@src/lib/cache/cacheHealth.js';

describe('cacheHealth', () => {
  it('readiness is ok for memory backend', () => {
    setActiveCacheBackend('memory');
    expect(getCacheReadinessCheck()).toEqual({ ok: true, backend: 'memory' });
  });

  it('reportCacheSuccess recovers from unhealthy', () => {
    setActiveCacheBackend('redis');
    reportCacheFailure(new Error('down'));
    reportCacheSuccess();
    expect(getCacheReadinessCheck().ok).toBe(true);
    setActiveCacheBackend('memory');
  });

  it('readiness fails when redis backend is unhealthy', () => {
    setActiveCacheBackend('redis');
    reportCacheFailure(new Error('down'));
    const check = getCacheReadinessCheck();
    expect(check.ok).toBe(false);
    expect(check.backend).toBe('redis');
    setActiveCacheBackend('memory');
  });
});
