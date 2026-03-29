import { describe, it, expect, beforeEach } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { FeedbackSubmissionsDao } from '@src/lib/persistence/sqlite/dao/FeedbackSubmissionsDao.js';

describe('FeedbackSubmissionsDao', () => {
  let db: SqliteDatabase;
  let dao: FeedbackSubmissionsDao;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    dao = new FeedbackSubmissionsDao(db);
  });

  const baseRow = {
    idempotency_key: 'key-1',
    message_id: 'msg-abc',
    rating: 'up',
    reason_code: null,
    free_text: null,
    category: null,
  };

  it('inserts a new feedback row and returns "inserted"', () => {
    const result = dao.insertOrSkip(baseRow);
    expect(result).toBe('inserted');
  });

  it('returns "duplicate" when the same idempotency key is used again', () => {
    dao.insertOrSkip(baseRow);
    const result = dao.insertOrSkip({ ...baseRow, rating: 'down' });
    expect(result).toBe('duplicate');
  });

  it('allows different idempotency keys for the same message', () => {
    dao.insertOrSkip(baseRow);
    const result = dao.insertOrSkip({ ...baseRow, idempotency_key: 'key-2' });
    expect(result).toBe('inserted');
  });

  it('stores optional fields (reasonCode, freeText, category)', () => {
    dao.insertOrSkip({
      ...baseRow,
      rating: 'down',
      reason_code: 'wrong_answer',
      free_text: 'Not helpful',
      category: 'RAIDING',
    });

    const row = db
      .prepare('SELECT * FROM feedback_submissions WHERE idempotency_key = ?')
      .get('key-1') as Record<string, unknown>;
    expect(row.rating).toBe('down');
    expect(row.reason_code).toBe('wrong_answer');
    expect(row.free_text).toBe('Not helpful');
    expect(row.category).toBe('RAIDING');
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  describe('getCountByCategory', () => {
    it('returns empty object when no rows', () => {
      expect(dao.getCountByCategory()).toEqual({});
    });

    it('groups counts by category', () => {
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k1', category: 'RAIDING' });
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k2', category: 'RAIDING' });
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k3', category: 'MSQ' });
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k4', category: null });

      const counts = dao.getCountByCategory();
      expect(counts).toEqual({
        RAIDING: 2,
        MSQ: 1,
        uncategorized: 1,
      });
    });
  });
});
