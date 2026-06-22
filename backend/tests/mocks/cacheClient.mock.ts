import { vi, type Mocked } from 'vitest';
import type { CacheClient } from '@src/lib/cache/types.js';
import { cacheMiss } from '@src/lib/cache/cacheGetResult.js';

export function createMockCacheClient(): Mocked<CacheClient> {
  return {
    get: vi.fn().mockResolvedValue(cacheMiss()),
    set: vi.fn().mockResolvedValue(undefined),
    setNx: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteByPrefix: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue(true),
  };
}
