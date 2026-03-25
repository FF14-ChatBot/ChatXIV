import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SqliteDatabase } from './types.js';

/**
 * Open a SQLite database at `filePath` with sane defaults for server use.
 * Does not run migrations — call `runMigrations(db)` at the composition root after open.
 * Ensures parent directory exists.
 */
export function openSqliteDatabase(filePath: string): SqliteDatabase {
  if (filePath !== ':memory:') {
    const dir = path.dirname(path.resolve(filePath));
    mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(filePath);
  // SQLite tuning for server workloads (no-op for in-memory).
  db.exec('PRAGMA journal_mode = WAL;');
  return db;
}
