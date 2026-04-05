import { describe, it, expect, beforeEach } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createSqliteMetricsStore } from '@src/lib/persistence/sqlite/sqliteMetricsStore.js';
import { createSqliteUsageStore } from '@src/lib/persistence/sqlite/sqliteUsageStore.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';

describe('SQLite observability stores', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
  });

  it('metrics: record, getEntries, getSummary', () => {
    const store = createSqliteMetricsStore(db);
    store.record({
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: 12,
      timestamp: new Date(1_700_000_000_000).toISOString(),
    });
    store.record({
      method: 'GET',
      route: '/missing',
      statusCode: 404,
      durationMs: 2,
      timestamp: new Date(1_700_000_000_001).toISOString(),
    });
    const entries = store.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].route).toBe('/health');
    expect(entries[1].statusCode).toBe(404);
    const summary = store.getSummary();
    expect(summary.totalRequests).toBe(2);
    expect(summary.byStatus[200]).toBe(1);
    expect(summary.byStatus[404]).toBe(1);
  });

  it('usage: record, getRecords, getCountByCategory', () => {
    const store = createSqliteUsageStore(db);
    store.record({
      category: UsageCategory.BIS,
      requestId: 'req-1',
      timestamp: new Date(1).toISOString(),
    });
    store.record({
      category: UsageCategory.BIS,
      requestId: 'req-2',
      timestamp: new Date(2).toISOString(),
    });
    expect(store.getRecords()).toHaveLength(2);
    const byCat = store.getCountByCategory();
    expect(byCat[UsageCategory.BIS]).toBe(2);
    expect(byCat[UsageCategory.MSQ]).toBe(0);
  });
});
