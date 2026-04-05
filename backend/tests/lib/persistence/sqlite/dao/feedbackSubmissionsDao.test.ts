import { FEEDBACK_CATEGORY_NONE_KEY } from '@chatxiv/cdm';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import {
  FeedbackSubmissionsDao,
  InsertResult,
} from '@src/lib/persistence/sqlite/dao/FeedbackSubmissionsDao.js';

vi.mock('@src/lib/observability/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { logger } from '@src/lib/observability/logger.js';

describe('FeedbackSubmissionsDao', () => {
  let db: SqliteDatabase;
  let dao: FeedbackSubmissionsDao;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    dao = new FeedbackSubmissionsDao(db);
    vi.clearAllMocks();
  });

  const baseRow = {
    idempotency_key: 'key-1',
    message_id: 'msg-abc',
    rating: 'up',
    reason_code: 'other',
    free_text: null,
    category: null,
  };

  it('inserts a new feedback row and returns InsertResult.INSERTED', () => {
    const result = dao.insertOrSkip(baseRow);
    expect(result).toBe(InsertResult.INSERTED);
  });

  it('returns InsertResult.DUPLICATE when the same idempotency key is used again', () => {
    dao.insertOrSkip(baseRow);
    const result = dao.insertOrSkip({ ...baseRow, rating: 'down' });
    expect(result).toBe(InsertResult.DUPLICATE);
  });

  it('logs a warning when a duplicate is detected', () => {
    dao.insertOrSkip(baseRow);
    dao.insertOrSkip({ ...baseRow, rating: 'down' });
    expect(logger.warn).toHaveBeenCalledWith(
      { idempotencyKey: 'key-1', messageId: 'msg-abc' },
      'Duplicate feedback submission detected'
    );
  });

  it('does not log on a fresh insert', () => {
    dao.insertOrSkip(baseRow);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('allows different idempotency keys for the same message', () => {
    dao.insertOrSkip(baseRow);
    const result = dao.insertOrSkip({ ...baseRow, idempotency_key: 'key-2' });
    expect(result).toBe(InsertResult.INSERTED);
  });

  it('stores all fields correctly', () => {
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

  describe('listAll', () => {
    it('returns empty array and zero total when no rows', () => {
      const { rows, total } = dao.listAll(10, 0);
      expect(rows).toEqual([]);
      expect(total).toBe(0);
    });

    it('returns rows ordered by created_at descending', () => {
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k1' }, '2025-01-01T00:00:00.000Z');
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k2' }, '2025-01-03T00:00:00.000Z');
      dao.insertOrSkip({ ...baseRow, idempotency_key: 'k3' }, '2025-01-02T00:00:00.000Z');

      const { rows, total } = dao.listAll(10, 0);
      expect(total).toBe(3);
      expect(rows.map((r) => r.idempotency_key)).toEqual(['k2', 'k3', 'k1']);
    });

    it('respects limit and offset for pagination', () => {
      for (let i = 1; i <= 5; i++) {
        dao.insertOrSkip({ ...baseRow, idempotency_key: `k${i}` }, `2025-01-0${i}T00:00:00.000Z`);
      }

      const page1 = dao.listAll(2, 0);
      expect(page1.rows).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.rows[0].idempotency_key).toBe('k5');
      expect(page1.rows[1].idempotency_key).toBe('k4');

      const page2 = dao.listAll(2, 2);
      expect(page2.rows).toHaveLength(2);
      expect(page2.rows[0].idempotency_key).toBe('k3');
    });
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
        [FEEDBACK_CATEGORY_NONE_KEY]: 1,
      });
    });
  });
});
