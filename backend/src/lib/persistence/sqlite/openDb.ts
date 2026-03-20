import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SqliteDatabase } from './types.js';
import { runMigrations } from './runMigrations.js';

/**
 * Open the observability SQLite database at `filePath`, run migrations, return handle.
 * Ensures parent directory exists.
 */
export function openObservabilityDatabase(filePath: string): SqliteDatabase {
  const dir = path.dirname(path.resolve(filePath));
  mkdirSync(dir, { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  runMigrations(db);
  return db;
}
