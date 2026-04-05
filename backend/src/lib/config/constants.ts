/** HTTP header names used for request context and correlation. */
export const HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  SESSION_ID: 'x-session-id',
} as const;

/**
 * Incoming request header names (lowercase; matches Node `IncomingMessage.headers` normalization).
 */
/** Names passed to `req.get()` / `req.set()` (Express treats these case-insensitively). */
export const INCOMING_HEADERS = {
  X_FORWARDED_PROTO: 'X-Forwarded-Proto',
  X_FORWARDED_HOST: 'x-forwarded-host',
  HOST: 'host',
  ORIGIN: 'Origin',
  REFERER: 'Referer',
  USER_AGENT: 'user-agent',
} as const;

/** Outbound response header names set by middleware. */
export const RESPONSE_HEADERS = {
  RETRY_AFTER: 'Retry-After',
  X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  X_FRAME_OPTIONS: 'X-Frame-Options',
  STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
} as const;

export const SECURITY_HEADER_VALUES = {
  X_CONTENT_TYPE_OPTIONS: 'nosniff',
  X_FRAME_OPTIONS: 'DENY',
  STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains',
} as const;

/**
 * Application paths and request limits — **code-only** (not `process.env`).
 * Change here and redeploy; do not add env vars for these.
 */
export const APP_DATA_DIRECTORY = './data' as const;

/** Express `json()` body size limit in KB. */
export const MAX_JSON_BODY_SIZE_KB = 50 as const;

/** Inbound HTTP request timeout (ms). */
export const REQUEST_TIMEOUT_MS = 30_000 as const;

/** Token-bucket rate limit: burst capacity (then refill applies). */
export const RATE_LIMIT_BUCKET_CAPACITY = 20 as const;

/** Tokens added per minute after use (sustained rate). */
export const RATE_LIMIT_REFILL_PER_MINUTE = 4 as const;

/** Environment variable names; use these instead of string literals for refactor safety. */
export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  LOG_LEVEL: 'LOG_LEVEL',
  DEBUG_MODE: 'DEBUG_MODE',
  /** Cloudflare Turnstile secret (server-side verify). See https://developers.cloudflare.com/turnstile/ */
  TURNSTILE_SECRET_KEY: 'TURNSTILE_SECRET_KEY',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  ANTHROPIC_MODEL: 'ANTHROPIC_MODEL',
  OIDC_ISSUER: 'OIDC_ISSUER',
  OIDC_CLIENT_ID: 'OIDC_CLIENT_ID',
  OIDC_CLIENT_SECRET: 'OIDC_CLIENT_SECRET',
  OIDC_REDIRECT_URI: 'OIDC_REDIRECT_URI',
  /** SPA base URL for redirects after OAuth (e.g. http://localhost:5173, https://www.chatxiv.com). */
  FRONTEND_ORIGIN: 'FRONTEND_ORIGIN',
  SESSION_SECRET: 'SESSION_SECRET',
  BOOTSTRAP_ADMIN_SUBS: 'BOOTSTRAP_ADMIN_SUBS',
  LOKI_HOST: 'LOKI_HOST',
  LOKI_USER_ID: 'LOKI_USER_ID',
  LOKI_PASSWORD: 'LOKI_PASSWORD',
} as const;

/** Cookie name for the signed session ID. */
export const SESSION_COOKIE = 'chatxiv_sid' as const;

/**
 * Hard cap on one user-authored chat message (UTF-16 code units). Tune in code + redeploy.
 * Separate from JSON body limit (`MAX_JSON_BODY_SIZE_KB`) for LLM cost / abuse per turn.
 */
export const CHAT_MAX_USER_MESSAGE_CHARS = 12_000;

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
