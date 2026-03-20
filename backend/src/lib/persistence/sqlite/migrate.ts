import type { SqliteDatabase } from './types.js';

/** Bump when adding new DDL in applyMigrations. */
const SCHEMA_VERSION = 1;

/**
 * Apply sequential migrations using SQLite `user_version`.
 * Must be safe to call on every process start.
 */
export function applyMigrations(db: SqliteDatabase): void {
  const current = Number(db.pragma('user_version', { simple: true }));
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS request_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        route TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_request_metrics_recorded_at ON request_metrics(recorded_at);

      CREATE TABLE IF NOT EXISTS usage_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        request_id TEXT NOT NULL,
        recorded_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON usage_records(recorded_at);
    `);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
}
