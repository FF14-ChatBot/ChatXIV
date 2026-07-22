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
  /** Redis connection URL (e.g. redis://localhost:6379). Used when cache backend is Redis. */
  REDIS_URL: 'REDIS_URL',
  /** `auto` | `memory` | `redis` — see `cacheConfig.ts`. */
  CACHE_BACKEND: 'CACHE_BACKEND',
  /** When true, startup fails if the resolved backend is Redis but ping fails. */
  REDIS_REQUIRED: 'REDIS_REQUIRED',
  /** Required by wiki policy; identifies app + contact, e.g. `ChatXIV/1.0 (contact@example.com)`. */
  MEDIAWIKI_USER_AGENT: 'MEDIAWIKI_USER_AGENT',
  MEDIAWIKI_TIMEOUT_MS: 'MEDIAWIKI_TIMEOUT_MS',
  /** Requests per second, applied per wiki (not global). */
  MEDIAWIKI_RATE_LIMIT_PER_SECOND: 'MEDIAWIKI_RATE_LIMIT_PER_SECOND',
  /** Overrides the default ConsoleGamesWiki base URL (testing or alternate endpoints). */
  MEDIAWIKI_CGW_URL: 'MEDIAWIKI_CGW_URL',
  /** Overrides the default Fandom FFXIV wiki base URL (testing or alternate endpoints). */
  MEDIAWIKI_FANDOM_FFXIV_URL: 'MEDIAWIKI_FANDOM_FFXIV_URL',
} as const;

/** Allowed `CACHE_BACKEND` env values — parsed in `cacheConfig.ts`. */
export const CacheBackend = {
  Auto: 'auto',
  Memory: 'memory',
  Redis: 'redis',
} as const;

export type CacheBackendSetting = (typeof CacheBackend)[keyof typeof CacheBackend];

/** Runtime cache store after resolving env (see `resolveCacheConfig()` in `cacheConfig.ts`). */
export const ResolvedCacheBackend = {
  Memory: 'memory',
  Redis: 'redis',
} as const;

export type ResolvedCacheBackend = (typeof ResolvedCacheBackend)[keyof typeof ResolvedCacheBackend];

/** Prefix for all cache keys in Redis (and logical keys in memory). */
export const CACHE_KEY_PREFIX = 'chatxiv:cache:' as const;

/** Interval for background Redis PING when the active cache backend is Redis. */
export const CACHE_HEALTH_PROBE_INTERVAL_MS = 15_000 as const;

/** TTL for XIVAPI search responses (24 hours). */
// TODO(DEV-23): Per-category TTL constants (BiS 7–14d, wiki 24–48h, etc.) — Cache-Layer-Per-Category.md §2.
export const CACHE_TTL_XIVAPI_SEARCH_SECONDS = 86_400 as const;

/** TR-9 stale grace beyond {@link CACHE_TTL_XIVAPI_SEARCH_SECONDS} (24 hours). */
// TODO(DEV-23): Tune stale grace per category when per-category TTL lands.
export const CACHE_STALE_GRACE_SECONDS = 86_400 as const;

/** Short TTL for in-flight fetch locks (coalescing concurrent cache misses). */
export const CACHE_FETCH_LOCK_TTL_SECONDS = 30 as const;

/** Poll interval while waiting for another caller to populate the cache after a lock miss. */
export const CACHE_FETCH_LOCK_POLL_INTERVAL_MS = 50 as const;

/** Max poll attempts while waiting for a coalesced fetch to complete. */
export const CACHE_FETCH_LOCK_POLL_ATTEMPTS = 10 as const;

/** Default XIVAPI search limit when resolver `topK` is unset. */
export const XIVAPI_SEARCH_DEFAULT_LIMIT = 8 as const;

/** Human-readable upstream name for XIVAPI (cache guards, citations, HTTP client). */
export const XIVAPI_DATA_SOURCE = 'XIVAPI' as const;

/** Human-readable upstream name for MediaWiki (cache guards, citations, HTTP client). */
export const MEDIAWIKI_DATA_SOURCE = 'MediaWiki' as const;

/** TTL for cached MediaWiki search+parse results (48 hours) -- wiki guide content is far more stable than XIVAPI's structured data, per Cache-Layer-Per-Category.md §2's "wiki 24-48h" guidance. */
export const CACHE_TTL_MEDIAWIKI_SEARCH_SECONDS = 48 * 60 * 60;

/** Redis command/connect timeout (ms). */
export const REDIS_COMMAND_TIMEOUT_MS = 5_000 as const;

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
export const METRICS_SKIP_ROUTE_PREFIXES = [
  '/v1/docs',
  '/v1/admin/docs',
  '/health',
  '/health/cache',
] as const;

export const XIVAPI_BASE_URL = 'https://v2.xivapi.com/api' as const;
export const XIVAPI_TIMEOUT_MS = 5_000 as const;
// Universalis API: https://docs.universalis.app/ — 25 req/s sustained, 50 req/s burst
export const XIVAPI_RATE_LIMIT_PER_SECOND = 25 as const;
export const XIVAPI_RATE_LIMIT_BURST = 50 as const;

/** Wikis the MediaWiki client supports (TR-8). */
export const MediaWikiWikiId = {
  ConsoleGamesWiki: 'consolegameswiki',
  FandomFfxiv: 'fandom_ffxiv',
} as const;

export type MediaWikiWikiId = (typeof MediaWikiWikiId)[keyof typeof MediaWikiWikiId];

/** Default per-wiki base URLs; override via {@link ENV_KEYS.MEDIAWIKI_CGW_URL} / {@link ENV_KEYS.MEDIAWIKI_FANDOM_FFXIV_URL}. */
export const MEDIAWIKI_DEFAULT_BASE_URLS: Readonly<Record<MediaWikiWikiId, string>> = {
  [MediaWikiWikiId.ConsoleGamesWiki]: 'https://ffxiv.consolegameswiki.com/mediawiki/api.php',
  [MediaWikiWikiId.FandomFfxiv]: 'https://finalfantasy.fandom.com/api.php',
} as const;

/** Default per-request timeout when {@link ENV_KEYS.MEDIAWIKI_TIMEOUT_MS} is unset. */
export const MEDIAWIKI_DEFAULT_TIMEOUT_MS = 5_000 as const;

/** Conservative default; applied per wiki, not globally (TR-8). */
export const MEDIAWIKI_DEFAULT_RATE_LIMIT_PER_SECOND = 1 as const;
