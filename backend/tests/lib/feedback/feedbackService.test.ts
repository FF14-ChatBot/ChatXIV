import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { FeedbackSubmissionsDao } from '@src/lib/persistence/sqlite/dao/FeedbackSubmissionsDao.js';
import { createFeedbackService } from '@src/lib/feedback/feedbackService.js';
import type { FeedbackService } from '@src/lib/feedback/types.js';

vi.mock('@src/lib/observability/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('createFeedbackService', () => {
  let db: SqliteDatabase;
  let service: FeedbackService;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    const dao = new FeedbackSubmissionsDao(db);
    service = createFeedbackService(dao);
  });

  const validBody = {
    messageId: 'msg-1',
    rating: 'up' as const,
    reasonCode: 'other' as const,
  };

  describe('submit', () => {
    it('returns { ok: true } on new submission', () => {
      const result = service.submit('key-1', validBody);
      expect(result).toEqual({ ok: true });
    });

    it('returns { ok: true } on duplicate submission (idempotent)', () => {
      service.submit('key-dup', validBody);
      const result = service.submit('key-dup', validBody);
      expect(result).toEqual({ ok: true });
    });

    it('persists the row in the database', () => {
      service.submit('key-persist', { ...validBody, freeText: 'hello', category: 'RAIDING' });
      const row = db
        .prepare('SELECT * FROM feedback_submissions WHERE idempotency_key = ?')
        .get('key-persist') as Record<string, unknown>;
      expect(row.message_id).toBe('msg-1');
      expect(row.rating).toBe('up');
      expect(row.reason_code).toBe('other');
      expect(row.free_text).toBe('hello');
      expect(row.category).toBe('RAIDING');
    });

    it('stores null for optional fields when omitted', () => {
      service.submit('key-minimal', validBody);
      const row = db
        .prepare('SELECT * FROM feedback_submissions WHERE idempotency_key = ?')
        .get('key-minimal') as Record<string, unknown>;
      expect(row.free_text).toBeNull();
      expect(row.category).toBeNull();
    });
  });

  describe('list', () => {
    it('returns empty page when no rows', () => {
      const result = service.list(1, 10);
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    });

    it('returns paginated results in wire shape (camelCase)', () => {
      for (let i = 1; i <= 5; i++) {
        service.submit(`key-${i}`, validBody);
      }
      const page1 = service.list(1, 2);
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.items[0]).toMatchObject({
        idempotencyKey: expect.any(String),
        messageId: 'msg-1',
        rating: 'up',
        reasonCode: 'other',
        freeText: null,
        category: null,
        createdAt: expect.any(String),
      });

      const page3 = service.list(3, 2);
      expect(page3.items).toHaveLength(1);
    });
  });

  describe('getCountByCategory', () => {
    it('returns empty object when no rows', () => {
      expect(service.getCountByCategory()).toEqual({});
    });

    it('groups counts by category', () => {
      service.submit('k1', { ...validBody, category: 'RAIDING' });
      service.submit('k2', { ...validBody, category: 'RAIDING' });
      service.submit('k3', { ...validBody, category: 'MSQ' });
      expect(service.getCountByCategory()).toEqual({ RAIDING: 2, MSQ: 1 });
    });
  });
});
