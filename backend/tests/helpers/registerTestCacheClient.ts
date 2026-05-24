import { container, CacheClientToken } from '@src/lib/di/container.js';
import type { CacheClient } from '@src/lib/cache/types.js';
import { createMockCacheClient } from '@test/mocks/cacheClient.mock.js';

/** Register a cache client in DI for tests that call `register()` without `initializeCacheSubsystem()`. */
export function registerTestCacheClient(
  client: CacheClient = createMockCacheClient()
): CacheClient {
  container.registerInstance(CacheClientToken, client);
  return client;
}
