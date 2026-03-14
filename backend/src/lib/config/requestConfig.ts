import { ENV_KEYS } from './constants.js';

const DEFAULT_MAX_BODY_KB = 50;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
/** Burst size; then refill gives sustained rate (see getRateLimitConfig). */
const DEFAULT_RATE_LIMIT_CAPACITY = 10;
/** Tokens added per minute after use; e.g. 2 = 2 requests/min sustained after burst. */
const DEFAULT_RATE_LIMIT_REFILL_PER_MIN = 2;

function parseEnvInt(key: string, defaultVal: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultVal;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? defaultVal : n;
}

export function getMaxBodySizeKb(): number {
  return parseEnvInt(ENV_KEYS.MAX_BODY_SIZE_KB, DEFAULT_MAX_BODY_KB);
}

export function getRequestTimeoutMs(): number {
  return parseEnvInt(ENV_KEYS.REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);
}

/** Request-related config (env-derived). Used by DI container and app. */
export interface RequestConfig {
  requestTimeoutMs: number;
  maxBodySizeKb: number;
}

export function getRequestConfig(): RequestConfig {
  return {
    requestTimeoutMs: getRequestTimeoutMs(),
    maxBodySizeKb: getMaxBodySizeKb(),
  };
}

/**
 * Token-bucket rate limit: up to `capacity` requests in a burst, then
 * `refillPerMin` tokens per minute (sustained rate). Not "capacity per N minutes".
 */
export interface RateLimitConfig {
  capacity: number;
  refillPerMin: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    capacity: parseEnvInt(ENV_KEYS.RATE_LIMIT_CAPACITY, DEFAULT_RATE_LIMIT_CAPACITY),
    refillPerMin: parseEnvInt(
      ENV_KEYS.RATE_LIMIT_REFILL_PER_MIN,
      DEFAULT_RATE_LIMIT_REFILL_PER_MIN
    ),
  };
}
