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

/** Strip UTF-8 BOM if present (some editors add it to `.env`). */
function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

/** Lazy-validated: returns undefined when unset so the admin auth middleware can respond with 401. */
export function getAdminApiKey(): string | undefined {
  const raw = process.env[ENV_KEYS.ADMIN_API_KEY];
  if (raw === undefined || raw === '') return undefined;
  const trimmed = stripBom(raw).trim();
  return trimmed === '' ? undefined : trimmed;
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
