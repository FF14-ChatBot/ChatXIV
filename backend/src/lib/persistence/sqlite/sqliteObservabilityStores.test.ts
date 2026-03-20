import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import type { SqliteDatabase } from './types.js';
import { runMigrations } from './runMigrations.js';
import { createSqliteMetricsStore } from './sqliteMetricsStore.js';
import { createSqliteUsageStore } from './sqliteUsageStore.js';

describe('SQLite observability stores', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('metrics: record, getEntries, getSummary', () => {
    const store = createSqliteMetricsStore(db);
    store.record({
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: 12,
      timestamp: 1_700_000_000_000,
    });
    const entries = store.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].route).toBe('/health');
    const summary = store.getSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.byStatus[200]).toBe(1);
  });

  it('usage: record, getRecords, getCountByCategory', () => {
    const store = createSqliteUsageStore(db);
    store.record({
      category: UsageCategory.BIS,
      requestId: 'req-1',
      timestamp: 1,
    });
    store.record({
      category: UsageCategory.BIS,
      requestId: 'req-2',
      timestamp: 2,
    });
    expect(store.getRecords()).toHaveLength(2);
    const byCat = store.getCountByCategory();
    expect(byCat[UsageCategory.BIS]).toBe(2);
    expect(byCat[UsageCategory.MSQ]).toBe(0);
  });
});
