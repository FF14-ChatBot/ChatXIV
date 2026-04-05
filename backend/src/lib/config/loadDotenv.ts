/**
 * Load `backend/.env` regardless of `process.cwd()` (dotenv's default only reads cwd).
 * Must be imported before any module that reads `process.env` for secrets (e.g. `app.ts` → `register()`).
 *
 * **Override:** Only when stage is not `beta` / `production` (`shouldDotenvOverrideShellEnv()`),
 * file values replace existing keys so stale shell env cannot mask `backend/.env`. For `beta` and
 * `production`, platform env wins. Uses raw shell `NODE_ENV` only — runs before `.env` is loaded.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldDotenvOverrideShellEnv } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '..', '.env');

const dotenvOverride = shouldDotenvOverrideShellEnv();

dotenv.config({ path: envPath, override: dotenvOverride });
