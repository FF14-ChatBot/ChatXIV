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

/**
 * Call once at startup before the server begins accepting requests.
 */
export function validateStartupConfig(): void {
  validateRequiredEnvKeys(STARTUP_REQUIRED);
}
