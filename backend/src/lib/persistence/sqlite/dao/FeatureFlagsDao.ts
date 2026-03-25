import type { SqliteDatabase } from '../types.js';
import type { FeatureFlagRow } from '../models/featureFlagRow.js';

export class FeatureFlagsDao {
  private readonly selectOneStmt;
  private readonly selectAllStmt;
  private readonly upsertStmt;
  private readonly deleteStmt;

  constructor(db: SqliteDatabase) {
    this.selectOneStmt = db.prepare(
      `SELECT name, enabled, created_at, updated_at
       FROM feature_flags
       WHERE name = ?`
    );
    this.selectAllStmt = db.prepare(
      `SELECT name, enabled, created_at, updated_at
       FROM feature_flags
       ORDER BY name ASC`
    );
    this.upsertStmt = db.prepare(
      `INSERT INTO feature_flags (name, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         enabled = excluded.enabled,
         updated_at = excluded.updated_at`
    );
    this.deleteStmt = db.prepare('DELETE FROM feature_flags WHERE name = ?');
  }

  selectOne(name: string): FeatureFlagRow | undefined {
    return this.selectOneStmt.get(name) as FeatureFlagRow | undefined;
  }

  selectAll(): FeatureFlagRow[] {
    return this.selectAllStmt.all() as FeatureFlagRow[];
  }

  upsert(name: string, enabled: 0 | 1, now: number = Date.now()): void {
    this.upsertStmt.run(name, enabled, now, now);
  }

  delete(name: string): boolean {
    const result = this.deleteStmt.run(name);
    return result.changes > 0;
  }
}
