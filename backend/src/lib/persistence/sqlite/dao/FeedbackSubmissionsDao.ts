import type { SqliteDatabase } from '../types.js';
import type { FeedbackSubmissionRow } from '../models/feedbackSubmissionRow.js';
import { logger } from '../../../observability/logger.js';

export const InsertResult = {
  INSERTED: 'inserted',
  DUPLICATE: 'duplicate',
} as const;
export type InsertResult = (typeof InsertResult)[keyof typeof InsertResult];

export class FeedbackSubmissionsDao {
  private readonly findByKeyStmt;
  private readonly insertStmt;
  private readonly countByCategoryStmt;
  private readonly listStmt;
  private readonly countStmt;

  constructor(db: SqliteDatabase) {
    this.findByKeyStmt = db.prepare(`SELECT 1 FROM feedback_submissions WHERE idempotency_key = ?`);
    this.insertStmt = db.prepare(
      `INSERT INTO feedback_submissions
         (idempotency_key, message_id, rating, reason_code, free_text, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    this.countByCategoryStmt = db.prepare(
      `SELECT category, COUNT(*) AS c FROM feedback_submissions GROUP BY category`
    );
    this.listStmt = db.prepare(
      `SELECT * FROM feedback_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    this.countStmt = db.prepare(`SELECT COUNT(*) AS c FROM feedback_submissions`);
  }

  /**
   * Insert a feedback row unless `idempotencyKey` already exists.
   * Returns `InsertResult.INSERTED` on new row, `InsertResult.DUPLICATE` when the key was already present.
   */
  insertOrSkip(
    row: Omit<FeedbackSubmissionRow, 'id' | 'created_at'>,
    now: string = new Date().toISOString()
  ): InsertResult {
    if (this.findByKeyStmt.get(row.idempotency_key)) {
      logger.warn(
        { idempotencyKey: row.idempotency_key, messageId: row.message_id },
        'Duplicate feedback submission detected'
      );
      return InsertResult.DUPLICATE;
    }
    this.insertStmt.run(
      row.idempotency_key,
      row.message_id,
      row.rating,
      row.reason_code,
      row.free_text ?? null,
      row.category ?? null,
      now
    );
    return InsertResult.INSERTED;
  }

  /** Return a page of feedback rows (newest first) and the total count. */
  listAll(limit: number, offset: number): { rows: FeedbackSubmissionRow[]; total: number } {
    const rows = this.listStmt.all(limit, offset) as FeedbackSubmissionRow[];
    const total = (this.countStmt.get() as { c: number }).c;
    return { rows, total };
  }

  /** Aggregate feedback counts grouped by category (null categories grouped as `null`). */
  getCountByCategory(): Record<string, number> {
    const rows = this.countByCategoryStmt.all() as { category: string | null; c: number }[];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.category ?? 'uncategorized'] = row.c;
    }
    return counts;
  }
}
