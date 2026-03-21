/**
 * Load `backend/.env` regardless of `process.cwd()` (dotenv’s default only reads cwd).
 * Must be imported before any module that reads `process.env` for secrets (e.g. `app.ts` → `register()`).
 *
 * **Override:** In local dev (`NODE_ENV` not `production` or `test`), file values replace existing
 * `process.env` keys so a stale `ADMIN_API_KEY` from the parent shell cannot mask `backend/.env`.
 * In `production`, the platform env wins. In `test` (Vitest), `tests/setup.ts` wins for pre-set keys.
 *
 * **ADMIN_API_KEY:** When `dotenvOverride` is on (same as above), we re-read this key from the file so a
 * stale shell `ADMIN_API_KEY` cannot win over `backend/.env`. We do **not** do this when override is off
 * (`production` / `test` at process start), so platform env is not replaced by a stray `.env` on the server.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV_KEYS } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '..', '.env');

const nodeEnv = process.env.NODE_ENV;
const dotenvOverride = nodeEnv !== 'production' && nodeEnv !== 'test';

dotenv.config({ path: envPath, override: dotenvOverride });

function stripLeadingBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

try {
  if (dotenvOverride && fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
    const raw = parsed[ENV_KEYS.ADMIN_API_KEY];
    if (raw !== undefined && stripLeadingBom(String(raw)).trim() !== '') {
      process.env[ENV_KEYS.ADMIN_API_KEY] = stripLeadingBom(String(raw)).trim();
    }
  }
} catch {
  // Malformed file: keep whatever dotenv.config applied
}
