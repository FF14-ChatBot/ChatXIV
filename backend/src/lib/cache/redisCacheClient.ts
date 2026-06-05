import type pino from 'pino';
import type { RedisClientType } from 'redis';
import { cacheHit, cacheMiss, cacheUnavailable } from './cacheGetResult.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';
import { toCacheStorageKey } from './cacheKeys.js';
import type { CacheClient } from './types.js';
import { pingRedis } from './redisConnection.js';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function createRedisCacheClient(redis: RedisClientType, log: pino.Logger): CacheClient {
  return {
    async get<T>(key: string) {
      const storageKey = toCacheStorageKey(key);
      try {
        const raw = await redis.get(storageKey);
        cacheBackendHealth.recordOperationSuccess();
        if (raw === null) {
          log.debug({ key }, 'Cache miss');
          return cacheMiss<T>();
        }
        try {
          const value = JSON.parse(raw) as T;
          log.debug({ key }, 'Cache hit');
          return cacheHit(value);
        } catch (parseErr) {
          log.warn({ err: parseErr, key }, 'Cache value JSON parse failed; treating as miss');
          log.debug({ key }, 'Cache miss');
          try {
            await redis.del(storageKey);
            cacheBackendHealth.recordOperationSuccess();
          } catch (delErr) {
            cacheBackendHealth.recordOperationFailure(delErr);
          }
          return cacheMiss<T>();
        }
      } catch (err) {
        cacheBackendHealth.recordOperationFailure(err);
        log.debug({ err, key }, 'Cache unavailable');
        return cacheUnavailable<T>(toError(err));
      }
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      const storageKey = toCacheStorageKey(key);
      const payload = JSON.stringify(value);
      try {
        await redis.set(storageKey, payload, { EX: ttlSeconds });
        cacheBackendHealth.recordOperationSuccess();
      } catch (err) {
        log.warn({ err, key }, 'Cache set failed');
        cacheBackendHealth.recordOperationFailure(err);
      }
    },

    async setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
      const storageKey = toCacheStorageKey(key);
      const payload = JSON.stringify(value);
      try {
        const options =
          ttlSeconds !== undefined ? { NX: true as const, EX: ttlSeconds } : { NX: true as const };
        const result = await redis.set(storageKey, payload, options);
        cacheBackendHealth.recordOperationSuccess();
        return result !== null;
      } catch (err) {
        log.warn({ err, key }, 'Cache setNx failed');
        cacheBackendHealth.recordOperationFailure(err);
        return false;
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await redis.del(toCacheStorageKey(key));
        cacheBackendHealth.recordOperationSuccess();
      } catch (err) {
        log.warn({ err, key }, 'Cache delete failed');
        cacheBackendHealth.recordOperationFailure(err);
      }
    },

    async deleteByPrefix(prefix: string): Promise<void> {
      const match = `${toCacheStorageKey(prefix)}*`;
      try {
        for await (const key of redis.scanIterator({ MATCH: match, COUNT: 100 })) {
          await redis.del(String(key));
        }
        cacheBackendHealth.recordOperationSuccess();
      } catch (err) {
        log.warn({ err, prefix }, 'Cache deleteByPrefix failed');
        cacheBackendHealth.recordOperationFailure(err);
      }
    },

    async ping(): Promise<boolean> {
      return pingRedis();
    },
  };
}
