import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SqliteDatabase } from './types.js';

/**
 * Open a SQLite database at `filePath` with sane defaults for server use.
 * Does not run migrations — call `runMigrations(db)` at the composition root after open.
 * Ensures parent directory exists.
 */
export function openSqliteDatabase(filePath: string): SqliteDatabase {
  const dir = path.dirname(path.resolve(filePath));
  mkdirSync(dir, { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  return db;
}
