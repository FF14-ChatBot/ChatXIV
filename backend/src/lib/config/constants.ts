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
  OIDC_ISSUER: 'OIDC_ISSUER',
  OIDC_CLIENT_ID: 'OIDC_CLIENT_ID',
  OIDC_CLIENT_SECRET: 'OIDC_CLIENT_SECRET',
  OIDC_REDIRECT_URI: 'OIDC_REDIRECT_URI',
  /** SPA base URL for redirects after OAuth (e.g. http://localhost:5173, https://www.chatxiv.com). */
  FRONTEND_ORIGIN: 'FRONTEND_ORIGIN',
  SESSION_SECRET: 'SESSION_SECRET',
  BOOTSTRAP_ADMIN_SUBS: 'BOOTSTRAP_ADMIN_SUBS',
} as const;

/** Cookie name for the signed session ID. */
export const SESSION_COOKIE = 'chatxiv_sid' as const;

/** Header and query param names that must be redacted in debug payloads (TR-19a). */
export const REDACT = {
  HEADER_NAMES: ['authorization', 'x-api-key', 'api-key', 'cookie'] as const,
  QUERY_PARAMS: ['key', 'token', 'api_key', 'apikey', 'auth'] as const,
} as const;

/**
 * Resolved metric routes matching these prefixes are not persisted (Swagger UI mounts, health).
 * Same intent as rate-limit skips for docs, but we still record API traffic under `/v1/admin`.
 */
export const METRICS_SKIP_ROUTE_PREFIXES = ['/v1/docs', '/v1/admin/docs', '/health'] as const;
