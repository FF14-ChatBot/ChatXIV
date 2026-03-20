import { USAGE_CATEGORIES } from '@chatxiv/cdm';
import type { SqliteDatabase } from '../types.js';
import type { UsageCategory, UsageRecord } from '../../../observability/usageAnalytics/types.js';

type UsageRow = {
  category: string;
  request_id: string;
  recorded_at: number;
};

export class UsageRecordsDao {
  private readonly insertStmt;
  private readonly selectAllStmt;
  private readonly countByCategoryStmt;

  constructor(db: SqliteDatabase) {
    this.insertStmt = db.prepare(
      `INSERT INTO usage_records (category, request_id, recorded_at)
       VALUES (@category, @request_id, @recorded_at)`
    );
    this.selectAllStmt = db.prepare(
      `SELECT category, request_id, recorded_at FROM usage_records ORDER BY id ASC`
    );
    this.countByCategoryStmt = db.prepare(
      `SELECT category, COUNT(*) AS c FROM usage_records GROUP BY category`
    );
  }

  insert(entry: UsageRecord): void {
    this.insertStmt.run({
      category: entry.category,
      request_id: entry.requestId,
      recorded_at: entry.timestamp,
    });
  }

  selectAll(): UsageRecord[] {
    const rows = this.selectAllStmt.all() as UsageRow[];
    return rows.map((r) => ({
      category: r.category as UsageCategory,
      requestId: r.request_id,
      timestamp: r.recorded_at,
    }));
  }

  getCountByCategory(): Record<UsageCategory, number> {
    const counts = Object.fromEntries(USAGE_CATEGORIES.map((c) => [c, 0])) as Record<
      UsageCategory,
      number
    >;
    const rows = this.countByCategoryStmt.all() as { category: string; c: number }[];
    for (const row of rows) {
      const cat = row.category as UsageCategory;
      counts[cat] = (counts[cat] ?? 0) + row.c;
    }
    return counts;
  }
}
