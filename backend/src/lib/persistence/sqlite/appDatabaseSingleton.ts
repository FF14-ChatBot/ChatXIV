import type { SqliteDatabase } from './types.js';
import { getObservabilityDatabasePath } from '../../config/env.js';
import { openSqliteDatabase } from './openDb.js';
import { runMigrations } from './runMigrations.js';

let singleton: SqliteDatabase | null = null;

/**
 * Shared application SQLite database (observability tables today; one file for logically grouped app data).
 * Opens with WAL; migrations run once per process before first use.
 */
export function getOrOpenAppDatabase(): SqliteDatabase {
  if (singleton === null) {
    const db = openSqliteDatabase(getObservabilityDatabasePath());
    runMigrations(db);
    singleton = db;
  }
  return singleton;
}

/** Close the singleton if open (e.g. graceful shutdown or tests). Idempotent. */
export function closeAppDatabase(): void {
  if (singleton !== null) {
    singleton.close();
    singleton = null;
  }
}
