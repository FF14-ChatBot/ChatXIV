/**
 * Environment **reads** and optional-default **warnings** (`[config] …` via `warnConfigEnvDefault`).
 *
 * - `process.env` is only touched in this folder’s config modules (see project rules).
 * - Warnings are deduped per key and skipped when `VITEST=true` (quiet tests).
 * - **Multi-variable** rules (e.g. Loki all-or-nothing) live next to the parser here, not in `validate.ts`.
 *
 * @see validate.ts — fatal startup gates only (`validateRequiredEnvKeys`).
 */
import path from 'node:path';
import os from 'node:os';
import {
  APP_DATA_DIRECTORY,
  ENV_KEYS,
  MEDIAWIKI_DEFAULT_BASE_URLS,
  MEDIAWIKI_DEFAULT_RATE_LIMIT_PER_SECOND,
  MEDIAWIKI_DEFAULT_TIMEOUT_MS,
  MediaWikiWikiId,
} from './constants.js';

const DEFAULT_PORT = 3000;

/** Dedupe and skip during Vitest (no console noise in tests). */
const envDefaultWarned = new Set<string>();

function warnConfigEnvDefault(
  dedupeKey: string,
  message: string,
  context: Record<string, unknown> = {}
): void {
  if (process.env.VITEST === 'true') return;
  if (envDefaultWarned.has(dedupeKey)) return;
  envDefaultWarned.add(dedupeKey);
  const suffix = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  console.warn(`[config] ${message}${suffix}`);
}

/** Unset/blank → warn once (`dedupeKey` = `envKey`) and `undefined`; otherwise trimmed value. */
function readOptionalTrimmedEnv(
  envKey: string,
  whenUnsetMessage: string,
  unsetContext: Record<string, unknown> = { defaultUsed: 'unset' }
): string | undefined {
  const v = process.env[envKey];
  if (!v || v.trim() === '') {
    warnConfigEnvDefault(envKey, whenUnsetMessage, unsetContext);
    return undefined;
  }
  return v.trim();
}

type OidcEnvKey =
  | typeof ENV_KEYS.OIDC_ISSUER
  | typeof ENV_KEYS.OIDC_CLIENT_ID
  | typeof ENV_KEYS.OIDC_CLIENT_SECRET
  | typeof ENV_KEYS.OIDC_REDIRECT_URI;

function readOidcEnv(envKey: OidcEnvKey): string | undefined {
  return readOptionalTrimmedEnv(envKey, `${envKey} is not set; OIDC login is disabled`);
}

/**
 * Logical stage from `NODE_ENV`. Supported values: `development` | `beta` | `production`.
 * `test` (Vitest) and legacy `dev` normalize to `development`.
 */
export const RUNTIME_STAGE = {
  DEVELOPMENT: 'development',
  BETA: 'beta',
  PRODUCTION: 'production',
} as const;

export type NodeEnv = (typeof RUNTIME_STAGE)[keyof typeof RUNTIME_STAGE];

/**
 * Whether `backend/.env` should override existing `process.env` keys (`dotenv` `override` flag).
 * Called from `loadDotenv.ts` **before** `dotenv.config()` — must not call `getNodeEnv()`, which
 * warns when `NODE_ENV` is unset even though `.env` is about to supply it.
 */
export function shouldDotenvOverrideShellEnv(): boolean {
  const raw = process.env[ENV_KEYS.NODE_ENV];
  if (raw === undefined || raw === '') return true;
  return raw !== RUNTIME_STAGE.PRODUCTION && raw !== RUNTIME_STAGE.BETA;
}

export function getNodeEnv(): NodeEnv {
  const raw = process.env[ENV_KEYS.NODE_ENV];
  const normalized =
    raw === undefined || raw === ''
      ? undefined
      : raw === 'test' || raw === 'dev'
        ? 'development'
        : raw;
  if (normalized === 'production') return RUNTIME_STAGE.PRODUCTION;
  if (normalized === 'beta') return RUNTIME_STAGE.BETA;
  if (normalized === 'development') return RUNTIME_STAGE.DEVELOPMENT;
  if (normalized === undefined) {
    warnConfigEnvDefault('NODE_ENV', `${ENV_KEYS.NODE_ENV} is not set; using default`, {
      defaultUsed: RUNTIME_STAGE.DEVELOPMENT,
    });
    return RUNTIME_STAGE.DEVELOPMENT;
  }
  warnConfigEnvDefault(
    'NODE_ENV:invalid',
    `Invalid ${ENV_KEYS.NODE_ENV}="${raw}"; expected development, beta, or production — using ${RUNTIME_STAGE.DEVELOPMENT}`,
    { defaultUsed: RUNTIME_STAGE.DEVELOPMENT }
  );
  return RUNTIME_STAGE.DEVELOPMENT;
}

export function isProduction(): boolean {
  return getNodeEnv() === RUNTIME_STAGE.PRODUCTION;
}

export function getPort(): number {
  const raw = process.env[ENV_KEYS.PORT];
  if (raw === undefined || raw === '') {
    warnConfigEnvDefault(ENV_KEYS.PORT, `${ENV_KEYS.PORT} is not set; using default`, {
      defaultUsed: DEFAULT_PORT,
    });
    return DEFAULT_PORT;
  }
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid PORT: "${raw}" (must be 1–65535)`);
  }
  return n;
}

/** SQLite parent directory (`APP_DATA_DIRECTORY` in `constants.ts`). Not env-driven. */
export function getDataDir(): string {
  return APP_DATA_DIRECTORY;
}

const APP_DB_FILENAME = 'app.db';

/**
 * Resolved path for the application SQLite database (metrics, usage, flags, etc.).
 * Under Vitest (`VITEST_WORKER_ID` set): temp file per worker. Otherwise `getDataDir()` + `/app.db`.
 */
export function getAppDatabasePath(): string {
  if (process.env.VITEST_WORKER_ID !== undefined) {
    const worker = process.env.VITEST_WORKER_ID;
    return path.join(os.tmpdir(), `chatxiv-test-w${worker}.db`);
  }

  const dir = getDataDir();
  const dataDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  return path.join(dataDir, APP_DB_FILENAME);
}

/**
 * Lazy-validated: returns undefined when unset so the caller (chat route)
 * can respond with 503 rather than crashing the whole server.
 */
export function getAnthropicApiKey(): string | undefined {
  return readOptionalTrimmedEnv(
    ENV_KEYS.ANTHROPIC_API_KEY,
    `${ENV_KEYS.ANTHROPIC_API_KEY} is not set; chat routes will return 503 until configured`
  );
}

export function getAnthropicModel(): string | undefined {
  return readOptionalTrimmedEnv(
    ENV_KEYS.ANTHROPIC_MODEL,
    `${ENV_KEYS.ANTHROPIC_MODEL} is not set; caller must supply a model or set this env var`
  );
}

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
const VALID_LOG_LEVELS: ReadonlySet<string> = new Set<LogLevel>([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]);

export function getLogLevel(): LogLevel {
  const raw = process.env[ENV_KEYS.LOG_LEVEL];
  if (raw && VALID_LOG_LEVELS.has(raw)) return raw as LogLevel;
  warnConfigEnvDefault(
    ENV_KEYS.LOG_LEVEL,
    !raw || raw === ''
      ? `${ENV_KEYS.LOG_LEVEL} is not set; using default`
      : `${ENV_KEYS.LOG_LEVEL} is invalid; using default`,
    { defaultUsed: 'info', ...(raw && raw !== '' ? { raw } : {}) }
  );
  return 'info';
}

export function getDebugMode(): boolean {
  const raw = process.env[ENV_KEYS.DEBUG_MODE];
  if (raw === undefined || raw === '') {
    warnConfigEnvDefault(ENV_KEYS.DEBUG_MODE, `${ENV_KEYS.DEBUG_MODE} is not set; using default`, {
      defaultUsed: false,
    });
    return false;
  }
  return raw.toLowerCase() === 'true' || raw === '1';
}

// ── OIDC / Auth ─────────────────────────────────────────────────────

export function getOidcIssuer(): string | undefined {
  return readOidcEnv(ENV_KEYS.OIDC_ISSUER);
}

export function getOidcClientId(): string | undefined {
  return readOidcEnv(ENV_KEYS.OIDC_CLIENT_ID);
}

export function getOidcClientSecret(): string | undefined {
  return readOidcEnv(ENV_KEYS.OIDC_CLIENT_SECRET);
}

export function getOidcRedirectUri(): string | undefined {
  return readOidcEnv(ENV_KEYS.OIDC_REDIRECT_URI);
}

/**
 * Public SPA origin (scheme + host + port). Used after OAuth so the browser lands on the frontend, not the API host.
 * Returns undefined if unset or invalid.
 */
export function getFrontendOrigin(): string | undefined {
  const trimmed = readOptionalTrimmedEnv(
    ENV_KEYS.FRONTEND_ORIGIN,
    `${ENV_KEYS.FRONTEND_ORIGIN} is not set; OAuth success redirect falls back to API host (/)`
  );
  if (trimmed === undefined) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      warnConfigEnvDefault(
        `${ENV_KEYS.FRONTEND_ORIGIN}:invalid`,
        `${ENV_KEYS.FRONTEND_ORIGIN} must be an http(s) URL; treating as unset`,
        { raw: trimmed }
      );
      return undefined;
    }
    return u.origin;
  } catch {
    warnConfigEnvDefault(
      `${ENV_KEYS.FRONTEND_ORIGIN}:invalid`,
      `${ENV_KEYS.FRONTEND_ORIGIN} is not a valid URL; treating as unset`,
      { raw: trimmed }
    );
    return undefined;
  }
}

/** Absolute URL to open after successful OAuth, or `/` on the API host if unset (not ideal for split SPA/API). */
export function getOauthSuccessRedirectUrl(): string {
  const origin = getFrontendOrigin();
  if (origin) return `${origin}/`;
  return '/';
}

export function getSessionSecret(): string | undefined {
  return readOptionalTrimmedEnv(
    ENV_KEYS.SESSION_SECRET,
    `${ENV_KEYS.SESSION_SECRET} is not set; signed cookies will not be used`
  );
}

/** Comma-separated OIDC `sub` values; unset or blank → `[]` (no `[config]` warning). */
export function getBootstrapAdminSubs(): string[] {
  const raw = process.env[ENV_KEYS.BOOTSTRAP_ADMIN_SUBS];
  if (!raw || raw.trim() === '') {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** Turnstile secret for siteverify; unset disables server checks (callers should treat as invalid). */
export function getTurnstileSecretKey(): string | undefined {
  return readOptionalTrimmedEnv(
    ENV_KEYS.TURNSTILE_SECRET_KEY,
    `${ENV_KEYS.TURNSTILE_SECRET_KEY} is not set; Turnstile verification is disabled`
  );
}

export type LokiPushConfig = {
  readonly host: string;
  readonly userId: string;
  readonly password: string;
};

export function getLokiPushConfig(): LokiPushConfig | undefined {
  const rawHost = process.env[ENV_KEYS.LOKI_HOST]?.trim();
  const userId = process.env[ENV_KEYS.LOKI_USER_ID]?.trim();
  const password = process.env[ENV_KEYS.LOKI_PASSWORD]?.trim();
  const setCount = [rawHost, userId, password].filter(Boolean).length;

  if (setCount === 3 && rawHost && userId && password) {
    let parsed: URL;
    try {
      parsed = new URL(rawHost.includes('://') ? rawHost : `https://${rawHost}`);
    } catch {
      return undefined;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    if (!parsed.hostname) return undefined;

    const host = `${parsed.protocol}//${parsed.host}`;
    return { host, userId, password };
  }

  if (setCount === 0) {
    warnConfigEnvDefault(
      'LOKI_PUSH',
      'Loki push disabled (set all of LOKI_HOST, LOKI_USER_ID, LOKI_PASSWORD to enable)',
      { defaultUsed: 'disabled' }
    );
    return undefined;
  }

  warnConfigEnvDefault(
    'LOKI_PARTIAL',
    'Partial Loki configuration ignored: set all of LOKI_HOST, LOKI_USER_ID, and LOKI_PASSWORD to enable Grafana Loki log shipping, or unset all three.',
    {}
  );
  return undefined;
}

// ── MediaWiki client ───────────────────────────────────────────────

/**
 * Required by wiki policy (TR-8). Falls back to a placeholder that identifies
 * the misconfiguration in wiki-side logs rather than sending a blank header.
 */
export function getMediaWikiUserAgent(): string {
  const trimmed = readOptionalTrimmedEnv(
    ENV_KEYS.MEDIAWIKI_USER_AGENT,
    `${ENV_KEYS.MEDIAWIKI_USER_AGENT} is not set; using a placeholder (wikis may block or rate-limit this)`
  );
  return trimmed ?? 'ChatXIV/1.0 (unconfigured-contact)';
}

/**
 * Reads a positive numeric env var: unset/blank/non-finite/non-positive all fall back to
 * `defaultValue` (with a warning). Uses `Number(...)` — not `parseInt`, which silently
 * truncates at the first non-digit (e.g. `parseInt('5e3', 10) === 5`, not `5000`) and would
 * accept garbage-suffixed input as a wildly wrong value instead of rejecting it. `!Number.isFinite`
 * (not `isNaN`) rejects `Infinity` too — `Number` silently overflows to `Infinity` on an
 * overlong numeric string.
 */
function readPositiveNumberEnv(envKey: string, defaultValue: number): number {
  const trimmed = readOptionalTrimmedEnv(envKey, `${envKey} is not set; using default`, {
    defaultUsed: defaultValue,
  });
  if (trimmed === undefined) return defaultValue;

  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    warnConfigEnvDefault(`${envKey}:invalid`, `${envKey} is invalid; using default`, {
      defaultUsed: defaultValue,
      raw: trimmed,
    });
    return defaultValue;
  }
  return n;
}

export function getMediaWikiTimeoutMs(): number {
  return readPositiveNumberEnv(ENV_KEYS.MEDIAWIKI_TIMEOUT_MS, MEDIAWIKI_DEFAULT_TIMEOUT_MS);
}

/** Requests per second, applied per wiki (not global) — see `mediawiki/rateLimit.ts`. */
export function getMediaWikiRateLimitPerSecond(): number {
  return readPositiveNumberEnv(
    ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND,
    MEDIAWIKI_DEFAULT_RATE_LIMIT_PER_SECOND
  );
}

const MEDIAWIKI_BASE_URL_ENV_KEYS: Readonly<Record<MediaWikiWikiId, string>> = {
  [MediaWikiWikiId.ConsoleGamesWiki]: ENV_KEYS.MEDIAWIKI_CGW_URL,
  [MediaWikiWikiId.FandomFfxiv]: ENV_KEYS.MEDIAWIKI_FANDOM_FFXIV_URL,
};

/** Base URL for `wikiId`; env override falls back to the built-in default (never unset). */
export function getMediaWikiBaseUrl(wikiId: MediaWikiWikiId): string {
  const envKey = MEDIAWIKI_BASE_URL_ENV_KEYS[wikiId];
  const trimmed = readOptionalTrimmedEnv(
    envKey,
    `${envKey} is not set; using default base URL for ${wikiId}`,
    { defaultUsed: MEDIAWIKI_DEFAULT_BASE_URLS[wikiId] }
  );
  return trimmed ?? MEDIAWIKI_DEFAULT_BASE_URLS[wikiId];
}
