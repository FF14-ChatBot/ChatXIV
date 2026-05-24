import type { RedisClientType } from 'redis';
import { logger } from '../observability/logger.js';
import { cacheHit, cacheMiss, cacheUnavailable } from './cacheGetResult.js';
import { reportCacheFailure, reportCacheSuccess } from './cacheHealth.js';
import { toCacheStorageKey } from './cacheKeys.js';
import type { CacheClient } from './types.js';
import { pingRedis } from './redisConnection.js';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function createRedisCacheClient(redis: RedisClientType): CacheClient {
  return {
    async get<T>(key: string) {
      const storageKey = toCacheStorageKey(key);
      try {
        const raw = await redis.get(storageKey);
        if (raw === null) {
          reportCacheSuccess();
          return cacheMiss<T>();
        }
        try {
          const value = JSON.parse(raw) as T;
          reportCacheSuccess();
          return cacheHit(value);
        } catch (parseErr) {
          logger.warn({ err: parseErr, key }, 'Cache value JSON parse failed; treating as miss');
          try {
            await redis.del(storageKey);
          } catch (delErr) {
            reportCacheFailure(delErr);
          }
          return cacheMiss<T>();
        }
      } catch (err) {
        reportCacheFailure(err);
        return cacheUnavailable<T>(toError(err));
      }
    },

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      const storageKey = toCacheStorageKey(key);
      const payload = JSON.stringify(value);
      try {
        if (ttlSeconds !== undefined) {
          await redis.set(storageKey, payload, { EX: ttlSeconds });
        } else {
          await redis.set(storageKey, payload);
        }
        reportCacheSuccess();
      } catch (err) {
        logger.warn({ err, key }, 'Cache set failed');
        reportCacheFailure(err);
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await redis.del(toCacheStorageKey(key));
        reportCacheSuccess();
      } catch (err) {
        logger.warn({ err, key }, 'Cache delete failed');
        reportCacheFailure(err);
      }
    },

    async deleteByPrefix(prefix: string): Promise<void> {
      const match = `${toCacheStorageKey(prefix)}*`;
      try {
        for await (const key of redis.scanIterator({ MATCH: match, COUNT: 100 })) {
          await redis.del(String(key));
        }
        reportCacheSuccess();
      } catch (err) {
        logger.warn({ err, prefix }, 'Cache deleteByPrefix failed');
        reportCacheFailure(err);
      }
    },

    async ping(): Promise<boolean> {
      return pingRedis();
    },
  };
}
