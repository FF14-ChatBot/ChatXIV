import { ENV_KEYS } from './constants.js';

/** Used when `CORS_ORIGIN` is unset. */
const DEFAULT_CORS_ORIGINS: readonly string[] = [
  'https://chatxiv.com',
  'https://www.chatxiv.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /** Same host as the API — Swagger UI “Try it out” sends this Origin on POST/PUT/DELETE. */
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://dev-www.chatxiv.com',
];

/** `CORS_ORIGIN` (comma-separated) replaces this list entirely when set. */
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
