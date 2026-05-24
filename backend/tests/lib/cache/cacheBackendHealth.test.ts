import { describe, it, expect } from 'vitest';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';

describe('cacheBackendHealth', () => {
  it('isHealthy is always true for memory backend', () => {
    cacheBackendHealth.configure('memory');
    cacheBackendHealth.recordOperationFailure(new Error('ignored for memory'));
    expect(cacheBackendHealth.isHealthy()).toBe(true);
  });

  it('isHealthy reflects Redis probe and operation failures', () => {
    cacheBackendHealth.configure('redis');
    expect(cacheBackendHealth.isHealthy()).toBe(true);
    cacheBackendHealth.recordOperationFailure(new Error('down'));
    expect(cacheBackendHealth.isHealthy()).toBe(false);
    cacheBackendHealth.configure('memory');
  });

  it('readiness is ok for memory backend', () => {
    cacheBackendHealth.configure('memory');
    expect(cacheBackendHealth.readiness()).toEqual({ ok: true, backend: 'memory' });
  });

  it('recordOperationSuccess recovers from unhealthy', () => {
    cacheBackendHealth.configure('redis');
    cacheBackendHealth.recordOperationFailure(new Error('down'));
    cacheBackendHealth.recordOperationSuccess();
    expect(cacheBackendHealth.readiness().ok).toBe(true);
    cacheBackendHealth.configure('memory');
  });

  it('readiness fails when redis backend is unhealthy', () => {
    cacheBackendHealth.configure('redis');
    cacheBackendHealth.recordOperationFailure(new Error('down'));
    const check = cacheBackendHealth.readiness();
    expect(check.ok).toBe(false);
    expect(check.backend).toBe('redis');
    expect(check.message).toBe('down');
    cacheBackendHealth.configure('memory');
  });
});
