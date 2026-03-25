import path from 'node:path';
import os from 'node:os';
import { ENV_KEYS } from './constants.js';

const DEFAULT_PORT = 3000;
const DEFAULT_DATA_DIR = './data';

export type NodeEnv = 'development' | 'production' | 'test';

export function getNodeEnv(): NodeEnv {
  const raw = process.env[ENV_KEYS.NODE_ENV];
  if (raw === 'production' || raw === 'test') return raw;
  return 'development';
}

export function isProduction(): boolean {
  return getNodeEnv() === 'production';
}

export function getPort(): number {
  const raw = process.env[ENV_KEYS.PORT];
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid PORT: "${raw}" (must be 1–65535)`);
  }
  return n;
}

export function getDataDir(): string {
  return process.env[ENV_KEYS.DATA_DIR] || DEFAULT_DATA_DIR;
}

const APP_DB_FILENAME = 'app.db';

/**
 * Resolved path for the application SQLite database (metrics, usage, flags, etc.).
 * - `NODE_ENV=test`: temp file per Vitest worker (`VITEST_WORKER_ID`) so parallel tests do not clash.
 * - Otherwise: `path.join(resolved DATA_DIR, app.db)`.
 */
export function getAppDatabasePath(): string {
  if (getNodeEnv() === 'test') {
    const worker = process.env.VITEST_WORKER_ID ?? '0';
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
  return process.env[ENV_KEYS.ANTHROPIC_API_KEY] || undefined;
}

export function getAnthropicModel(): string | undefined {
  return process.env[ENV_KEYS.ANTHROPIC_MODEL] || undefined;
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
  return 'info';
}

export function getDebugMode(): boolean {
  const raw = process.env[ENV_KEYS.DEBUG_MODE];
  if (raw === undefined || raw === '') return false;
  return raw.toLowerCase() === 'true' || raw === '1';
}

// ── OIDC / Auth ─────────────────────────────────────────────────────

export function getOidcIssuer(): string | undefined {
  return process.env[ENV_KEYS.OIDC_ISSUER] || undefined;
}

export function getOidcClientId(): string | undefined {
  return process.env[ENV_KEYS.OIDC_CLIENT_ID] || undefined;
}

export function getOidcClientSecret(): string | undefined {
  return process.env[ENV_KEYS.OIDC_CLIENT_SECRET] || undefined;
}

export function getOidcRedirectUri(): string | undefined {
  return process.env[ENV_KEYS.OIDC_REDIRECT_URI] || undefined;
}

/**
 * Public SPA origin (scheme + host + port). Used after OAuth so the browser lands on the frontend, not the API host.
 * Returns undefined if unset or invalid.
 */
export function getFrontendOrigin(): string | undefined {
  const raw = process.env[ENV_KEYS.FRONTEND_ORIGIN];
  if (raw === undefined || raw.trim() === '') return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.origin;
  } catch {
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
  return process.env[ENV_KEYS.SESSION_SECRET] || undefined;
}

export function getBootstrapAdminSubs(): string[] {
  const raw = process.env[ENV_KEYS.BOOTSTRAP_ADMIN_SUBS];
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
