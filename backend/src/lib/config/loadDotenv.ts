/**
 * Load `backend/.env` regardless of `process.cwd()` (dotenv's default only reads cwd).
 * Must be imported before any module that reads `process.env` for secrets (e.g. `app.ts` → `register()`).
 *
 * **Override:** In local dev (`NODE_ENV` not `production` or `test`), file values replace existing
 * `process.env` keys so stale shell values cannot mask `backend/.env`.
 * In `production`, the platform env wins. In `test` (Vitest), `tests/setup.ts` wins for pre-set keys.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '..', '.env');

const nodeEnv = process.env.NODE_ENV;
const dotenvOverride = nodeEnv !== 'production' && nodeEnv !== 'test';

dotenv.config({ path: envPath, override: dotenvOverride });
