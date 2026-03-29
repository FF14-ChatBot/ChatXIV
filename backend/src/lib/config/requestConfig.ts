import {
  MAX_JSON_BODY_SIZE_KB,
  RATE_LIMIT_BUCKET_CAPACITY,
  RATE_LIMIT_REFILL_PER_MINUTE,
  REQUEST_TIMEOUT_MS,
} from './constants.js';

/** Request-related config. Used by DI container and app. */
export interface RequestConfig {
  requestTimeoutMs: number;
  maxBodySizeKb: number;
}

export function getMaxBodySizeKb(): number {
  return MAX_JSON_BODY_SIZE_KB;
}

export function getRequestTimeoutMs(): number {
  return REQUEST_TIMEOUT_MS;
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
    capacity: RATE_LIMIT_BUCKET_CAPACITY,
    refillPerMin: RATE_LIMIT_REFILL_PER_MINUTE,
  };
}
