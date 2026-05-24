import { createClient, type RedisClientType } from 'redis';
import { REDIS_COMMAND_TIMEOUT_MS } from '../config/constants.js';
import { logger } from '../observability/logger.js';
import { markCacheUnhealthyFromProbe, reportCacheSuccess } from './cacheHealth.js';

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
    markCacheUnhealthyFromProbe(err);
  });

  next.on('ready', () => {
    reportCacheSuccess();
  });

  client = next as RedisClientType;
  await client.connect();
}

export async function pingRedis(): Promise<boolean> {
  if (!client || !client.isOpen) return false;
  try {
    const pong = await client.ping();
    if (pong === 'PONG') {
      reportCacheSuccess();
      return true;
    }
    markCacheUnhealthyFromProbe(new Error(`Unexpected PING response: ${String(pong)}`));
    return false;
  } catch (err) {
    markCacheUnhealthyFromProbe(err);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  const toClose = client;
  client = null;
  redisUrl = null;
  if (toClose.isOpen) {
    await toClose.quit();
  }
}
