import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SqliteDatabase } from './types.js';
import { getObservabilitySqlitePath } from './config.js';
import { applyMigrations } from './migrate.js';

/**
 * Open the observability SQLite database at the configured path, run migrations, return handle.
 * Ensures parent directory exists.
 */
export function openObservabilityDatabase(filePath: string): SqliteDatabase {
  const dir = path.dirname(path.resolve(filePath));
  mkdirSync(dir, { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  applyMigrations(db);
  return db;
}

/** Open DB using env-derived path; throws if path is not configured. */
export function openObservabilityDatabaseFromEnv(): SqliteDatabase {
  const filePath = getObservabilitySqlitePath();
  if (filePath === null) {
    throw new Error(
      'openObservabilityDatabaseFromEnv: no SQLite path (set SQLITE_DB_PATH or OBSERVABILITY_SQLITE=1)'
    );
  }
  return openObservabilityDatabase(filePath);
}
