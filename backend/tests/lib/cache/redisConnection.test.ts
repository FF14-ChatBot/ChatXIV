import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActiveCacheBackend } from '@src/lib/cache/cacheHealth.js';

const handlers: Record<string, (arg?: unknown) => void> = {};

const mockClient = {
  isOpen: true,
  connect: vi.fn(async () => {
    mockClient.isOpen = true;
  }),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn((event: string, cb: (arg?: unknown) => void) => {
    handlers[event] = cb;
  }),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}));

describe('redisConnection', () => {
  beforeEach(() => {
    setActiveCacheBackend('redis');
    mockClient.isOpen = true;
    vi.clearAllMocks();
    handlers.error = undefined as unknown as (arg?: unknown) => void;
    handlers.ready = undefined as unknown as (arg?: unknown) => void;
  });

  afterEach(async () => {
    const { closeRedis } = await import('@src/lib/cache/redisConnection.js');
    await closeRedis();
    setActiveCacheBackend('memory');
  });

  it('connects and pings successfully', async () => {
    const { connectRedis, pingRedis, isRedisClientInitialized } = await import(
      '@src/lib/cache/redisConnection.js'
    );
    await connectRedis('redis://localhost:6379');
    expect(isRedisClientInitialized()).toBe(true);
    await expect(pingRedis()).resolves.toBe(true);
  });

  it('returns false from ping when client is closed', async () => {
    const { connectRedis, pingRedis, closeRedis } = await import(
      '@src/lib/cache/redisConnection.js'
    );
    await connectRedis('redis://localhost:6379');
    mockClient.isOpen = false;
    await expect(pingRedis()).resolves.toBe(false);
    await closeRedis();
  });

  it('returns false when ping response is unexpected', async () => {
    const { connectRedis, pingRedis } = await import('@src/lib/cache/redisConnection.js');
    await connectRedis('redis://localhost:6379');
    vi.mocked(mockClient.ping).mockResolvedValueOnce('NOPE' as unknown as 'PONG');
    await expect(pingRedis()).resolves.toBe(false);
  });

  it('returns false when ping throws', async () => {
    const { connectRedis, pingRedis } = await import('@src/lib/cache/redisConnection.js');
    await connectRedis('redis://localhost:6379');
    vi.mocked(mockClient.ping).mockRejectedValueOnce(new Error('timeout'));
    await expect(pingRedis()).resolves.toBe(false);
  });

  it('getRedisClient throws before connect', async () => {
    const { getRedisClient } = await import('@src/lib/cache/redisConnection.js');
    expect(() => getRedisClient()).toThrow('Redis client is not initialized');
  });

  it('reconnects when url matches and client was closed', async () => {
    const { connectRedis } = await import('@src/lib/cache/redisConnection.js');
    await connectRedis('redis://localhost:6379');
    mockClient.isOpen = false;
    await connectRedis('redis://localhost:6379');
    expect(mockClient.connect).toHaveBeenCalledTimes(2);
  });

  it('registers error and ready handlers', async () => {
    const { connectRedis } = await import('@src/lib/cache/redisConnection.js');
    const { isCacheHealthy, reportCacheFailure } = await import('@src/lib/cache/cacheHealth.js');
    await connectRedis('redis://localhost:6379');
    expect(handlers.error).toBeTypeOf('function');
    expect(handlers.ready).toBeTypeOf('function');
    reportCacheFailure(new Error('down'));
    handlers.ready?.();
    expect(isCacheHealthy()).toBe(true);
    handlers.error?.(new Error('socket'));
    expect(isCacheHealthy()).toBe(false);
  });
});
