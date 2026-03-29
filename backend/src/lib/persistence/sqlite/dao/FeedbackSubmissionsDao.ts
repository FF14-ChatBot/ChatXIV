import type { SqliteDatabase } from '../types.js';
import type { FeedbackSubmissionRow } from '../models/feedbackSubmissionRow.js';

export class FeedbackSubmissionsDao {
  private readonly findByKeyStmt;
  private readonly insertStmt;
  private readonly countByCategoryStmt;

  constructor(db: SqliteDatabase) {
    this.findByKeyStmt = db.prepare(
      `SELECT 1 FROM feedback_submissions WHERE idempotency_key = ?`
    );
    this.insertStmt = db.prepare(
      `INSERT INTO feedback_submissions
         (idempotency_key, message_id, rating, reason_code, free_text, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    this.countByCategoryStmt = db.prepare(
      `SELECT category, COUNT(*) AS c FROM feedback_submissions GROUP BY category`
    );
  }

  /**
   * Insert a feedback row unless `idempotencyKey` already exists.
   * Returns `'inserted'` on new row, `'duplicate'` when the key was already present.
   */
  insertOrSkip(
    row: Omit<FeedbackSubmissionRow, 'id' | 'created_at'>,
    now: string = new Date().toISOString(),
  ): 'inserted' | 'duplicate' {
    if (this.findByKeyStmt.get(row.idempotency_key)) {
      return 'duplicate';
    }
    this.insertStmt.run(
      row.idempotency_key,
      row.message_id,
      row.rating,
      row.reason_code ?? null,
      row.free_text ?? null,
      row.category ?? null,
      now,
    );
    return 'inserted';
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
