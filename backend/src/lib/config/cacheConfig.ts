/**
 * Cache backend resolution and startup validation.
 *
 * @see backend/.env.example — CACHE_BACKEND, REDIS_URL, REDIS_REQUIRED
 */
import { ENV_KEYS } from './constants.js';

export const CacheBackend = {
  Auto: 'auto',
  Memory: 'memory',
  Redis: 'redis',
} as const;

export type CacheBackendSetting = (typeof CacheBackend)[keyof typeof CacheBackend];

export type ResolvedCacheBackend = 'memory' | 'redis';

export interface ResolvedCacheConfig {
  readonly backend: ResolvedCacheBackend;
  readonly redisUrl: string | undefined;
  readonly redisRequired: boolean;
}

function readTrimmedEnv(key: string): string | undefined {
  const v = process.env[key];
  if (v === undefined || v.trim() === '') return undefined;
  return v.trim();
}

function parseBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = readTrimmedEnv(key);
  if (raw === undefined) return defaultValue;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  throw new Error(`Invalid ${key}: "${raw}" (expected true, false, 1, or 0)`);
}

export function getCacheBackendSetting(): CacheBackendSetting {
  const raw = readTrimmedEnv(ENV_KEYS.CACHE_BACKEND);
  if (raw === undefined) return CacheBackend.Auto;
  if (raw === CacheBackend.Auto || raw === CacheBackend.Memory || raw === CacheBackend.Redis) {
    return raw;
  }
  throw new Error(`Invalid ${ENV_KEYS.CACHE_BACKEND}: "${raw}" (expected auto, memory, or redis)`);
}

export function getRedisUrl(): string | undefined {
  return readTrimmedEnv(ENV_KEYS.REDIS_URL);
}

export function getRedisRequired(): boolean {
  return parseBooleanEnv(ENV_KEYS.REDIS_REQUIRED, false);
}

export function resolveCacheConfig(): ResolvedCacheConfig {
  const setting = getCacheBackendSetting();
  const redisUrl = getRedisUrl();
  const redisRequired = getRedisRequired();

  if (setting === CacheBackend.Memory) {
    return { backend: 'memory', redisUrl, redisRequired };
  }

  if (setting === CacheBackend.Redis) {
    return { backend: 'redis', redisUrl, redisRequired };
  }

  // auto
  if (redisUrl !== undefined) {
    return { backend: 'redis', redisUrl, redisRequired };
  }
  return { backend: 'memory', redisUrl: undefined, redisRequired };
}

/**
 * Fatal startup checks for cache env combinations. Call from `validateStartupConfig()`.
 */
export function validateCacheConfig(): void {
  const setting = getCacheBackendSetting();
  const redisUrl = getRedisUrl();
  const redisRequired = getRedisRequired();

  if (setting === CacheBackend.Redis && !redisRequired) {
    console.error(
      `Fatal: ${ENV_KEYS.CACHE_BACKEND}=redis requires ${ENV_KEYS.REDIS_REQUIRED}=true`
    );
    process.exit(1);
  }

  if (setting === CacheBackend.Redis && redisUrl === undefined) {
    console.error(`Fatal: ${ENV_KEYS.CACHE_BACKEND}=redis requires ${ENV_KEYS.REDIS_URL}`);
    process.exit(1);
  }

  const resolved = resolveCacheConfig();
  if (resolved.backend === 'redis' && resolved.redisUrl === undefined) {
    console.error(`Fatal: cache backend is redis but ${ENV_KEYS.REDIS_URL} is not set`);
    process.exit(1);
  }

  if (setting === CacheBackend.Memory && redisUrl !== undefined && process.env.VITEST !== 'true') {
    console.warn(
      `[config] ${ENV_KEYS.REDIS_URL} is set but ${ENV_KEYS.CACHE_BACKEND}=memory; URL is ignored`
    );
  }
}
