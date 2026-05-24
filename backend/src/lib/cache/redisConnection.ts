import { createClient, type RedisClientType } from 'redis';
import { REDIS_COMMAND_TIMEOUT_MS } from '../config/constants.js';
import { logger } from '../observability/logger.js';
import { cacheBackendHealth } from './cacheBackendHealth.js';

let client: RedisClientType | null = null;
let redisUrl: string | null = null;

export function getRedisClient(): RedisClientType {
  if (!client) {
    throw new Error('Redis client is not initialized');
  }
  return client;
}

export function isRedisClientInitialized(): boolean {
  return client !== null;
}

export async function connectRedis(url: string): Promise<void> {
  if (client && redisUrl === url) {
    if (!client.isOpen) {
      await client.connect();
    }
    return;
  }

  if (client) {
    await closeRedis();
  }

  redisUrl = url;
  const next = createClient({
    url,
    socket: {
      connectTimeout: REDIS_COMMAND_TIMEOUT_MS,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          logger.warn({ retries }, 'Redis reconnect attempts exhausted for this cycle');
          return false;
        }
        return Math.min(retries * 200, 2_000);
      },
    },
  });

  next.on('error', (err) => {
    cacheBackendHealth.recordOperationFailure(err);
  });

  next.on('ready', () => {
    cacheBackendHealth.recordOperationSuccess();
  });

  client = next as RedisClientType;
  await client.connect();
}

export async function pingRedis(): Promise<boolean> {
  if (!client || !client.isOpen) return false;
  try {
    const pong = await client.ping();
    if (pong === 'PONG') {
      cacheBackendHealth.recordOperationSuccess();
      return true;
    }
    cacheBackendHealth.recordOperationFailure(
      new Error(`Unexpected PING response: ${String(pong)}`)
    );
    return false;
  } catch (err) {
    cacheBackendHealth.recordOperationFailure(err);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  const toClose = client;
  client = null;
  redisUrl = null;
  if (!toClose.isOpen) return;
  try {
    await toClose.quit();
  } catch (err) {
    logger.error({ err }, 'Failed to close Redis connection cleanly');
    throw err;
  }
}
