import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { ENV_KEYS } from '@src/lib/config/constants.js';
import { CacheClientToken, container, register } from '@src/lib/di/container.js';
import type { CacheClient } from '@src/lib/cache/types.js';
import { createMemoryCacheClient } from '@src/lib/cache/memoryCacheClient.js';
import { resetBackendContainerForTests } from '@test/helpers/resetBackendContainer.js';

vi.mock('@src/lib/cache/createCacheClient.js', () => ({
  createCacheClientForConfig: vi.fn(),
}));

import { createCacheClientForConfig } from '@src/lib/cache/createCacheClient.js';
import {
  disposeCacheSubsystem,
  getCacheSubsystemClient,
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

  it('getCacheSubsystemClient throws before initialize', () => {
    expect(() => getCacheSubsystemClient()).toThrow('Cache subsystem is not initialized');
  });

  it('initializeCacheSubsystem registers memory client in DI', async () => {
    vi.mocked(createCacheClientForConfig).mockResolvedValue(createMemoryCacheClient());
    const client = await initializeCacheSubsystem();
    expect(client).toBeDefined();
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
    expect(await client.ping()).toBe(true);
  });

  it('disposeCacheSubsystem clears client state', async () => {
    vi.mocked(createCacheClientForConfig).mockResolvedValue(createMemoryCacheClient());
    await initializeCacheSubsystem();
    await disposeCacheSubsystem();
    expect(() => getCacheSubsystemClient()).toThrow();
  });

  it('initializes redis backend and warns when ping fails but not required', async () => {
    process.env[ENV_KEYS.CACHE_BACKEND] = 'redis';
    process.env[ENV_KEYS.REDIS_URL] = 'redis://localhost:6379';
    process.env[ENV_KEYS.REDIS_REQUIRED] = 'false';
    const client = createMemoryCacheClient();
    vi.spyOn(client, 'ping').mockResolvedValue(false);
    vi.mocked(createCacheClientForConfig).mockResolvedValue(client);
    await initializeCacheSubsystem();
    expect(container.resolve<CacheClient>(CacheClientToken)).toBe(client);
  });
});
