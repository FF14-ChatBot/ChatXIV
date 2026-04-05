import type { SqliteDatabase } from '../persistence/sqlite/types.js';
import type { FeatureFlagRecord, FeatureFlagStore } from './types.js';
import { FeatureFlagsDao } from '../persistence/sqlite/dao/FeatureFlagsDao.js';
import type { FeatureFlagRow } from '../persistence/sqlite/models/featureFlagRow.js';

function rowToRecord(row: FeatureFlagRow): FeatureFlagRecord {
  return {
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** @param db - Shared database handle; caller owns lifecycle. */
export function createSqliteFeatureFlagStore(db: SqliteDatabase): FeatureFlagStore {
  const dao = new FeatureFlagsDao(db);

  return {
    async get(name: string): Promise<FeatureFlagRecord | undefined> {
      const row = dao.selectOne(name);
      return row ? rowToRecord(row) : undefined;
    },

    async getAll(): Promise<Readonly<Record<string, FeatureFlagRecord>>> {
      const rows = dao.selectAll();
      const entries = rows.map((r) => [r.name, rowToRecord(r)] as const);
      return Object.fromEntries(entries);
    },

    async set(name: string, enabled: boolean): Promise<void> {
      dao.upsert(name, enabled ? 1 : 0);
    },

    async remove(name: string): Promise<boolean> {
      return dao.delete(name);
    },
  };
}
