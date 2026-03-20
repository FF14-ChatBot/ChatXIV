/**
 * Observability SQLite path selection (metrics + usage).
 * Aligns with docs/tasks/backend README and Environment-Config-And-Secrets (DATA_DIR).
 */

import path from 'node:path';
import { ENV_KEYS } from '../../config/constants.js';

function isTruthyEnv(val: string | undefined): boolean {
  if (val === undefined || val === '') return false;
  const v = val.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Resolved file path for the observability DB, or `null` to keep in-memory stores.
 * - Set `SQLITE_DB_PATH` to an absolute or relative path → SQLite enabled at that path.
 * - Or set `OBSERVABILITY_SQLITE=1` → uses `{DATA_DIR}/chatxiv.db` (default DATA_DIR `data`).
 */
export function getObservabilitySqlitePath(): string | null {
  const explicit = process.env[ENV_KEYS.SQLITE_DB_PATH]?.trim();
  if (explicit) return explicit;

  if (isTruthyEnv(process.env[ENV_KEYS.OBSERVABILITY_SQLITE])) {
    const dir = process.env[ENV_KEYS.DATA_DIR]?.trim() || 'data';
    return path.join(dir, 'chatxiv.db');
  }

  return null;
}

export function shouldUseSqliteObservability(): boolean {
  return getObservabilitySqlitePath() !== null;
}
