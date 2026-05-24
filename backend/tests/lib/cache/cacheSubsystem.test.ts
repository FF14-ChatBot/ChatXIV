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
import {
  disposeCacheSubsystem,
  getCacheClient,
  initializeCacheSubsystem,
} from '@src/lib/cache/cacheSubsystem.js';

describe('cacheSubsystem', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    resetBackendContainerForTests();
    register();
    delete process.env[ENV_KEYS.REDIS_URL];
    process.env[ENV_KEYS.CACHE_BACKEND] = 'memory';
  });

  afterEach(async () => {
    await disposeCacheSubsystem();
    process.env = { ...saved };
    resetBackendContainerForTests();
    register();
  });

  it('getCacheClient throws before initialize', () => {
    expect(() => getCacheClient()).toThrow('Cache is not initialized');
  });

  it('resolve CacheClientToken throws before initializeCacheSubsystem', () => {
    expect(() => container.resolve<CacheClient>(CacheClientToken)).toThrow();
  });

  it('initializeCacheSubsystem registers the client in DI', async () => {
    const client = createMockCacheClient();
    vi.mocked(createCacheClientForConfig).mockResolvedValue(client);
    const initialized = await initializeCacheSubsystem();
    expect(initialized).toBe(client);
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
  });

  it('disposeCacheSubsystem clears client state', async () => {
    vi.mocked(createCacheClientForConfig).mockResolvedValue(createMockCacheClient());
    await initializeCacheSubsystem();
    await disposeCacheSubsystem();
    expect(() => getCacheClient()).toThrow();
  });

  it('initializes redis backend and warns when ping fails but not required', async () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_URL] = 'redis://localhost:6379';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'false';
    const client = createMockCacheClient();
    client.ping.mockResolvedValue(false);
    vi.mocked(createCacheClientForConfig).mockResolvedValue(client);
    await initializeCacheSubsystem();
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
  });
});
