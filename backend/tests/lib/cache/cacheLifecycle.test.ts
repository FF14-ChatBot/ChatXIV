import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { ENV_KEYS } from '@src/lib/config/constants.js';
import { CacheClientToken, container, register } from '@src/lib/di/container.js';
import type { CacheClient } from '@src/lib/cache/types.js';
import { createMockCacheClient } from '@test/mocks/cacheClient.mock.js';
import { resetBackendContainerForTests } from '@test/helpers/resetBackendContainer.js';

vi.mock('@src/lib/cache/createCacheClient.js', () => ({
  createCacheClientForConfig: vi.fn(),
}));

import { createCacheClientForConfig } from '@src/lib/cache/createCacheClient.js';
import { disposeCache, getCacheClient, initializeCache } from '@src/lib/cache/cacheLifecycle.js';

describe('cacheLifecycle', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    resetBackendContainerForTests();
    register();
    delete process.env[ENV_KEYS.REDIS_URL];
    process.env[ENV_KEYS.CACHE_BACKEND] = 'memory';
  });

  afterEach(async () => {
    await disposeCache();
    process.env = { ...saved };
    resetBackendContainerForTests();
    register();
  });

  it('getCacheClient throws before initialize', () => {
    expect(() => getCacheClient()).toThrow('Cache is not initialized');
  });

  it('resolve CacheClientToken throws before initializeCache', () => {
    expect(() => container.resolve<CacheClient>(CacheClientToken)).toThrow();
  });

  it('initializeCache registers the client in DI', async () => {
    const client = createMockCacheClient();
    vi.mocked(createCacheClientForConfig).mockResolvedValue(client);
    const initialized = await initializeCache();
    expect(initialized).toBe(client);
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
  });

  it('disposeCache clears client state', async () => {
    vi.mocked(createCacheClientForConfig).mockResolvedValue(createMockCacheClient());
    await initializeCache();
    await disposeCache();
    expect(() => getCacheClient()).toThrow();
  });

  it('initializes redis backend and warns when ping fails but not required', async () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_URL] = 'redis://localhost:6379';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'false';
    const client = createMockCacheClient();
    client.ping.mockResolvedValue(false);
    vi.mocked(createCacheClientForConfig).mockResolvedValue(client);
    await initializeCache();
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
  });
});
