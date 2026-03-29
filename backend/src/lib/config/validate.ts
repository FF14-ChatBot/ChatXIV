import { ENV_KEYS } from './constants.js';
import { getFrontendOrigin, getOidcIssuer } from './env.js';

/**
 * Env var names that must be set for the server to start.
 * Leave empty when every critical setting has a code default.
 * Feature-specific secrets stay lazy-validated on use.
 */
const STARTUP_REQUIRED: readonly string[] = [];

/**
 * Exits the process if any listed env var is missing or empty.
 * Reusable for scripts or future startup checks; covered by tests when keys are non-empty.
 */
export function validateRequiredEnvKeys(keys: readonly string[]): void {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Fatal: missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }
}

export function warnIfPartialLokiEnv(): void {
  const h = process.env[ENV_KEYS.LOKI_HOST]?.trim();
  const u = process.env[ENV_KEYS.LOKI_USER_ID]?.trim();
  const p = process.env[ENV_KEYS.LOKI_PASSWORD]?.trim();
  const setCount = [h, u, p].filter((x) => Boolean(x)).length;
  if (setCount > 0 && setCount < 3) {
    console.warn(
      'Partial Loki configuration ignored: set all of LOKI_HOST, LOKI_USER_ID, and LOKI_PASSWORD to enable Grafana Loki log shipping, or unset all three.'
    );
  }
}

/** Call once at startup before the server begins accepting requests. */
export function validateStartupConfig(): void {
  validateRequiredEnvKeys(STARTUP_REQUIRED);
  warnIfPartialLokiEnv();
  if (getOidcIssuer() && !getFrontendOrigin()) {
    console.warn(
      'FRONTEND_ORIGIN is not set: OAuth will redirect to this API host (/). Set FRONTEND_ORIGIN to your SPA URL (e.g. http://localhost:5173 or https://www.chatxiv.com).'
    );
  }
}
