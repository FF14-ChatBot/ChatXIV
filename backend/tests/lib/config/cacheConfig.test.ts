import { describe, it, expect, afterEach, vi } from 'vitest';
import { CacheBackend, ResolvedCacheBackend } from '@src/lib/config/constants.js';
import {
  getCacheBackendSetting,
  getRedisRequired,
  resolveCacheConfig,
  validateCacheConfig,
} from '@src/lib/config/cacheConfig.js';
import { ENV_KEYS } from '@src/lib/config/constants.js';

describe('lib/config/cacheConfig', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it('defaults to redis backend and in-memory when REDIS_URL is unset', () => {
    delete process.env[ENV_KEYS.CACHE_BACKEND];
    delete process.env[ENV_KEYS.REDIS_URL];
    expect(getCacheBackendSetting()).toBe(CacheBackend.Redis);
    expect(resolveCacheConfig().backend).toBe(ResolvedCacheBackend.Memory);
  });

  it('auto selects redis when REDIS_URL is set', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'auto';
    process.env[ENV_KEYS.REDIS_URL] = 'redis://localhost:6379';
    expect(resolveCacheConfig()).toEqual({
      backend: ResolvedCacheBackend.Redis,
      redisUrl: 'redis://localhost:6379',
      redisRequired: false,
    });
  });

  it('parses REDIS_REQUIRED', () => {
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'true';
    expect(getRedisRequired()).toBe(true);
    process.env[ENV_KEYS.REDIS_REQUIRED] = '0';
    expect(getRedisRequired()).toBe(false);
  });

  it('exits when CACHE_BACKEND=redis without REDIS_URL and REDIS_REQUIRED=true', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'true';
    delete process.env[ENV_KEYS.REDIS_URL];
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    validateCacheConfig();
    expect(error).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('warns when CACHE_BACKEND=redis without REDIS_URL and REDIS_REQUIRED=false', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'false';
    delete process.env[ENV_KEYS.REDIS_URL];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    validateCacheConfig();
    expect(warn).toHaveBeenCalled();
  });

  it('rejects invalid CACHE_BACKEND', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'memcached';
    expect(() => getCacheBackendSetting()).toThrow(/Invalid/);
  });

  it('rejects invalid REDIS_REQUIRED', () => {
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'maybe';
    expect(() => getRedisRequired()).toThrow(/Invalid/);
  });

  it('resolveCacheConfig uses memory backend explicitly', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'memory';
    expect(resolveCacheConfig().backend).toBe(ResolvedCacheBackend.Memory);
  });

  it('allows CACHE_BACKEND=redis with REDIS_REQUIRED=false when REDIS_URL is set', () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_URL] = 'redis://localhost:6379';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'false';
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    validateCacheConfig();
    expect(exit).not.toHaveBeenCalled();
  });
});
