import type { ResolvedCacheConfig } from '../config/cacheConfig.js';
import { ResolvedCacheBackend } from '../config/constants.js';
import { logger } from '../observability/logger.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';
import { createMemoryCacheClient } from './memoryCacheClient.js';
import { createRedisCacheClient } from './redisCacheClient.js';
import { connectRedis, getRedisClient } from './redisConnection.js';
import type { CacheClient } from './types.js';

export async function createCacheClientForConfig(
  config: ResolvedCacheConfig
): Promise<CacheClient> {
  cacheBackendHealth.configure(config.backend);

  if (config.backend === ResolvedCacheBackend.Memory) {
    return createMemoryCacheClient(logger);
  }

  if (config.redisUrl === undefined) {
    throw new Error('Redis cache backend requires REDIS_URL');
  }

  await connectRedis(config.redisUrl);
  return createRedisCacheClient(getRedisClient(), logger);
}
