import { ENV_KEYS } from './constants.js';

/** Fallback origins used when CORS_ORIGIN env var is not set. */
const DEFAULT_CORS_ORIGINS: readonly string[] = [
  'https://chatxiv.com',
  'https://www.chatxiv.com',
  'http://localhost:5173',
];

/**
 * Returns allowed CORS origins.
 * Reads from the CORS_ORIGIN env var (comma-separated) when set;
 * falls back to the hardcoded defaults otherwise.
 */
export function getCorsOrigins(): string[] {
  const raw = process.env[ENV_KEYS.CORS_ORIGIN];
  if (raw) {
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_CORS_ORIGINS];
}
