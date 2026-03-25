import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SqliteDatabase } from './types.js';

/**
 * Ensure `schema_migrations` exists, then apply any `migrations/*.sql` files not yet recorded.
 * Safe to call on every process start.
 *
 * **Ordering:** files are applied in lexicographic sort (`001_…`, `002_…`, `003_…`).
 * `001_initial_observability.sql` and `002_feature_flags.sql` are committed baselines — do not
 * change their SQL after they have shipped; add new DDL only in `003_*.sql` and later.
 */
export function runMigrations(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const alreadyApplied = db.prepare('SELECT name FROM schema_migrations').all() as {
    name: string;
  }[];
  const appliedSet = new Set(alreadyApplied.map((r) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    db.exec('BEGIN;');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString()
      );
      db.exec('COMMIT;');
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // Ignore rollback errors; we want to surface the original failure.
      }
      throw err;
    }
  }
}
