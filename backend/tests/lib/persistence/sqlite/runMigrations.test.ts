import { describe, it, expect } from 'vitest';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';

describe('runMigrations', () => {
  it('applies pending SQL files once and is idempotent', () => {
    const db = openSqliteDatabase(':memory:');
    runMigrations(db);
    runMigrations(db);
    const row = db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number };
    expect(row.c).toBeGreaterThanOrEqual(1);
    const names = db.prepare('SELECT name FROM schema_migrations ORDER BY name').all() as {
      name: string;
    }[];
    const initial = names.filter((n) => n.name.endsWith('.sql'));
    expect(initial.length).toBeGreaterThanOrEqual(1);
    runMigrations(db);
    const names2 = db.prepare('SELECT name FROM schema_migrations ORDER BY name').all() as {
      name: string;
    }[];
    expect(names2).toEqual(names);
  });
});
