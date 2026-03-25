import { describe, it, expect, beforeEach } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { RequestMetricsDao } from '@src/lib/persistence/sqlite/dao/RequestMetricsDao.js';
import { UsageRecordsDao } from '@src/lib/persistence/sqlite/dao/UsageRecordsDao.js';
import {
  MAX_REQUEST_METRICS_ROWS,
  MAX_USAGE_RECORDS_ROWS,
  sweepObservabilityRetention,
} from '@src/lib/persistence/sqlite/retention.js';

describe('sweepObservabilityRetention', () => {
  let db: SqliteDatabase;
  let metricsDao: RequestMetricsDao;
  let usageDao: UsageRecordsDao;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    metricsDao = new RequestMetricsDao(db);
    usageDao = new UsageRecordsDao(db);
  });

  it('trims request_metrics to MAX_REQUEST_METRICS_ROWS by oldest recorded_at', () => {
    const insert = db.prepare(
      `INSERT INTO request_metrics (method, route, status_code, duration_ms, recorded_at)
       VALUES ('GET', '/x', 200, 1, ?)`
    );
    const n = MAX_REQUEST_METRICS_ROWS + 5;
    for (let i = 0; i < n; i++) {
      insert.run(i);
    }
    sweepObservabilityRetention(metricsDao, usageDao);
    const row = db.prepare('SELECT COUNT(*) AS c FROM request_metrics').get() as { c: number };
    expect(row.c).toBe(MAX_REQUEST_METRICS_ROWS);
    const min = db.prepare('SELECT MIN(recorded_at) AS m FROM request_metrics').get() as {
      m: number;
    };
    expect(min.m).toBe(5);
  });

  it('trims usage_records to MAX_USAGE_RECORDS_ROWS by oldest recorded_at', () => {
    const insert = db.prepare(
      `INSERT INTO usage_records (category, request_id, recorded_at) VALUES ('bis', ?, ?)`
    );
    const n = MAX_USAGE_RECORDS_ROWS + 10;
    for (let i = 0; i < n; i++) {
      insert.run(`r${i}`, i);
    }
    sweepObservabilityRetention(metricsDao, usageDao);
    const row = db.prepare('SELECT COUNT(*) AS c FROM usage_records').get() as { c: number };
    expect(row.c).toBe(MAX_USAGE_RECORDS_ROWS);
    const min = db.prepare('SELECT MIN(recorded_at) AS m FROM usage_records').get() as {
      m: number;
    };
    expect(min.m).toBe(10);
  });
});
