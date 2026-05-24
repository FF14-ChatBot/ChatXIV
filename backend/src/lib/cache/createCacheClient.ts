import type { ResolvedCacheConfig } from '../config/cacheConfig.js';
import { setActiveCacheBackend } from './cacheHealth.js';
import { createMemoryCacheClient } from './memoryCacheClient.js';
import { createRedisCacheClient } from './redisCacheClient.js';
import { connectRedis, getRedisClient } from './redisConnection.js';
import type { CacheClient } from './types.js';

export async function createCacheClientForConfig(
  config: ResolvedCacheConfig
): Promise<CacheClient> {
  setActiveCacheBackend(config.backend);

  if (config.backend === 'memory') {
    return createMemoryCacheClient();
  }

  if (config.redisUrl === undefined) {
    throw new Error('Redis cache backend requires REDIS_URL');
  }

  await connectRedis(config.redisUrl);
  return createRedisCacheClient(getRedisClient());
}
