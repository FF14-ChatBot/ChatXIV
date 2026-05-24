/**
 * Cache backend resolution and startup validation.
 *
 * Wire values: `CacheBackend` / `ResolvedCacheBackend` in `constants.ts` (with `ENV_KEYS`).
 * Parsing pattern matches `RUNTIME_STAGE` in `env.ts` — `as const` object, derived union, env read here.
 *
 * @see backend/.env.example — CACHE_BACKEND (default redis), REDIS_URL, REDIS_REQUIRED
 */
import {
  CacheBackend,
  ENV_KEYS,
  ResolvedCacheBackend,
  type CacheBackendSetting,
} from './constants.js';

export type { CacheBackendSetting };

const CACHE_BACKEND_SETTING_VALUES: readonly CacheBackendSetting[] = Object.values(CacheBackend);

const DEFAULT_CACHE_BACKEND_SETTING = CacheBackend.Redis;

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

function isCacheBackendSetting(raw: string): raw is CacheBackendSetting {
  return (CACHE_BACKEND_SETTING_VALUES as readonly string[]).includes(raw);
}

export function getCacheBackendSetting(): CacheBackendSetting {
  const raw = readTrimmedEnv(ENV_KEYS.CACHE_BACKEND);
  if (raw === undefined) return DEFAULT_CACHE_BACKEND_SETTING;
  if (isCacheBackendSetting(raw)) {
    return raw;
  }
  throw new Error(
    `Invalid ${ENV_KEYS.CACHE_BACKEND}: "${raw}" (expected ${CACHE_BACKEND_SETTING_VALUES.join(', ')})`
  );
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
    return { backend: ResolvedCacheBackend.Memory, redisUrl, redisRequired };
  }

  if (setting === CacheBackend.Redis) {
    if (redisUrl !== undefined) {
      return { backend: ResolvedCacheBackend.Redis, redisUrl, redisRequired };
    }
    if (!redisRequired) {
      return {
        backend: ResolvedCacheBackend.Memory,
        redisUrl: undefined,
        redisRequired: false,
      };
    }
    return { backend: ResolvedCacheBackend.Redis, redisUrl, redisRequired };
  }

  // auto
  if (redisUrl !== undefined) {
    return { backend: ResolvedCacheBackend.Redis, redisUrl, redisRequired };
  }
  return {
    backend: ResolvedCacheBackend.Memory,
    redisUrl: undefined,
    redisRequired: false,
  };
}

/**
 * Fatal startup checks for cache env combinations. Call from `validateStartupConfig()`.
 */
export function validateCacheConfig(): void {
  const setting = getCacheBackendSetting();
  const redisUrl = getRedisUrl();
  const redisRequired = getRedisRequired();

  if (setting === CacheBackend.Redis && redisUrl === undefined && redisRequired) {
    console.error(`Fatal: ${ENV_KEYS.CACHE_BACKEND}=redis requires ${ENV_KEYS.REDIS_URL}`);
    process.exit(1);
  }

  if (setting === CacheBackend.Redis && redisUrl === undefined && !redisRequired) {
    console.warn(
      `[config] ${ENV_KEYS.CACHE_BACKEND}=redis but ${ENV_KEYS.REDIS_URL} is unset; using in-memory cache until Redis is configured`
    );
  }

  const resolved = resolveCacheConfig();
  if (
    resolved.backend === ResolvedCacheBackend.Redis &&
    resolved.redisUrl === undefined &&
    redisRequired
  ) {
    console.error(`Fatal: cache backend is redis but ${ENV_KEYS.REDIS_URL} is not set`);
    process.exit(1);
  }

  if (setting === CacheBackend.Memory && redisUrl !== undefined && process.env.VITEST !== 'true') {
    console.warn(
      `[config] ${ENV_KEYS.REDIS_URL} is set but ${ENV_KEYS.CACHE_BACKEND}=memory; URL is ignored`
    );
  }
}
