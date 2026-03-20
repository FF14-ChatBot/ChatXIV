/**
 * SQLite-backed UsageStore — same contract as in-memory.
 */

import type { SqliteDatabase } from './types.js';
import { USAGE_CATEGORIES } from '@chatxiv/cdm';
import type {
  UsageRecord,
  UsageStore,
  UsageCategory,
} from '../../observability/usageAnalytics/types.js';

/** Match in-memory cap (see inMemoryUsageAnalytics.ts). */
const MAX_ROWS = 50_000;

type UsageRow = {
  category: string;
  request_id: string;
  recorded_at: number;
};

function trimOldUsage(db: SqliteDatabase): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM usage_records').get() as { c: number };
  if (row.c <= MAX_ROWS) return;
  const excess = row.c - MAX_ROWS;
  db.prepare(
    `DELETE FROM usage_records WHERE id IN (
      SELECT id FROM usage_records ORDER BY recorded_at ASC LIMIT ?
    )`
  ).run(excess);
}

/** @param db - Shared database handle; caller owns lifecycle. */
export function createSqliteUsageStore(db: SqliteDatabase): UsageStore {
  const insert = db.prepare(
    `INSERT INTO usage_records (category, request_id, recorded_at)
     VALUES (@category, @request_id, @recorded_at)`
  );

  const selectAll = db.prepare(
    `SELECT category, request_id, recorded_at FROM usage_records ORDER BY id ASC`
  );

  const countByCategoryStmt = db.prepare(
    `SELECT category, COUNT(*) AS c FROM usage_records GROUP BY category`
  );

  return {
    record(entry: UsageRecord): void {
      insert.run({
        category: entry.category,
        request_id: entry.requestId,
        recorded_at: entry.timestamp,
      });
      trimOldUsage(db);
    },
    getRecords(): UsageRecord[] {
      const rows = selectAll.all() as UsageRow[];
      return rows.map((r) => ({
        category: r.category as UsageCategory,
        requestId: r.request_id,
        timestamp: r.recorded_at,
      }));
    },
    getCountByCategory(): Record<UsageCategory, number> {
      const counts = Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<
        UsageCategory,
        number
      >;
      const rows = countByCategoryStmt.all() as { category: string; c: number }[];
      for (const row of rows) {
        const cat = row.category as UsageCategory;
        if ((USAGE_CATEGORIES as readonly string[]).includes(row.category)) {
          counts[cat] = row.c;
        }
      }
      return counts;
    },
    clear(): void {
      db.prepare('DELETE FROM usage_records').run();
    },
  };
}
