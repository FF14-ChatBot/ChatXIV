import { CACHE_HEALTH_PROBE_INTERVAL_MS, ResolvedCacheBackend } from '../config/constants.js';
import { resolveCacheConfig } from '../config/cacheConfig.js';
import { container, CacheClientToken } from '../di/container.js';
import type { CacheClient } from './types.js';
import { createCacheClientForConfig } from './createCacheClient.js';
import { closeRedis, pingRedis } from './redisConnection.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';
import { logger } from '../observability/logger.js';

let probeTimer: ReturnType<typeof setInterval> | null = null;
let cacheClient: CacheClient | null = null;

export function getCacheClient(): CacheClient {
  if (!cacheClient) {
    throw new Error('Cache is not initialized');
  }
  return cacheClient;
}

/**
 * Connects Redis when configured, validates required Redis, and starts the health probe.
 * Call once after `validateStartupConfig()` and before accepting traffic.
 */
export async function initializeCacheSubsystem(): Promise<CacheClient> {
  const config = resolveCacheConfig();
  cacheClient = await createCacheClientForConfig(config);
  container.registerInstance(CacheClientToken, cacheClient);

  if (config.backend === ResolvedCacheBackend.Redis) {
    const ok = await cacheClient.ping();
    if (!ok && config.redisRequired) {
      console.error('Fatal: REDIS_REQUIRED=true but Redis PING failed at startup');
      process.exit(1);
    }
    if (!ok) {
      logger.warn('Redis PING failed at startup; cache marked unhealthy until recovery');
    }
    startCacheHealthProbe();
  }

  return cacheClient;
}

function startCacheHealthProbe(): void {
  if (probeTimer) return;
  probeTimer = setInterval(() => {
    void (async () => {
      if (!cacheBackendHealth.isRedisBackend()) return;
      const ok = await pingRedis();
      if (!ok) {
        cacheBackendHealth.recordOperationFailure(new Error('Redis health probe failed'));
      }
    })();
  }, CACHE_HEALTH_PROBE_INTERVAL_MS);
  probeTimer.unref();
}

export async function disposeCacheSubsystem(): Promise<void> {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
  cacheClient = null;
  await closeRedis();
}
