/** HTTP header names used for request context and correlation. */
export const HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  SESSION_ID: 'x-session-id',
} as const;

/** Environment variable names; use these instead of string literals for refactor safety. */
export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  LOG_LEVEL: 'LOG_LEVEL',
  DEBUG_MODE: 'DEBUG_MODE',
  MAX_BODY_SIZE_KB: 'MAX_BODY_SIZE_KB',
  REQUEST_TIMEOUT_MS: 'REQUEST_TIMEOUT_MS',
  RATE_LIMIT_CAPACITY: 'RATE_LIMIT_CAPACITY',
  RATE_LIMIT_REFILL_PER_MIN: 'RATE_LIMIT_REFILL_PER_MIN',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  ANTHROPIC_MODEL: 'ANTHROPIC_MODEL',
  DATA_DIR: 'DATA_DIR',
  ADMIN_API_KEY: 'ADMIN_API_KEY',
  /** Optional override for observability SQLite file (metrics + usage). Default: `{DATA_DIR}/observability.db` (or temp file in test). */
  OBSERVABILITY_DATABASE_PATH: 'OBSERVABILITY_DATABASE_PATH',
} as const;

/** Header and query param names that must be redacted in debug payloads (TR-19a). */
export const REDACT = {
  HEADER_NAMES: ['authorization', 'x-api-key', 'x-admin-key', 'api-key', 'cookie'] as const,
  QUERY_PARAMS: ['key', 'token', 'api_key', 'apikey', 'auth'] as const,
} as const;
