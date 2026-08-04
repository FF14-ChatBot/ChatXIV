/**
 * Fatal startup **validation** only: missing required keys → `console.error` + `process.exit(1)`.
 *
 * Optional env reads, defaults, and `[config]` warnings live in `env.ts` (and related parsers such as
 * `requestConfig.ts` / `cors.ts` / `cacheConfig.ts`) next to the code that consumes each value.
 */
import { validateCacheConfig } from './cacheConfig.js';
import { validateMediaWikiConfig } from './env.js';

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

/** Call once at startup before the server begins accepting requests. */
export function validateStartupConfig(): void {
  validateRequiredEnvKeys(STARTUP_REQUIRED);
  validateCacheConfig();
  validateMediaWikiConfig();
}
