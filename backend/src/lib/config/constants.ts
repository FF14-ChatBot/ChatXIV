/** HTTP header names used for request context and correlation. */
export const HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  SESSION_ID: 'x-session-id',
} as const;

/** Environment variable names; use these instead of string literals for refactor safety. */
export const ENV_KEYS = {
  LOG_LEVEL: 'LOG_LEVEL',
  DEBUG_MODE: 'DEBUG_MODE',
  MAX_BODY_SIZE_KB: 'MAX_BODY_SIZE_KB',
  REQUEST_TIMEOUT_MS: 'REQUEST_TIMEOUT_MS',
  RATE_LIMIT_CAPACITY: 'RATE_LIMIT_CAPACITY',
  RATE_LIMIT_REFILL_PER_MIN: 'RATE_LIMIT_REFILL_PER_MIN',
} as const;

/** Header and query param names that must be redacted in debug payloads (TR-19a). */
export const REDACT = {
  HEADER_NAMES: ['authorization', 'x-api-key', 'api-key', 'cookie'] as const,
  QUERY_PARAMS: ['key', 'token', 'api_key', 'apikey', 'auth'] as const,
} as const;
