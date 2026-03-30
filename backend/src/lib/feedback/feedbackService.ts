import type {
  FeedbackBody,
  FeedbackCountByCategory,
  FeedbackRating,
  FeedbackReasonCode,
  FeedbackResponse,
  FeedbackSubmission,
  PaginatedResult,
  UsageCategory,
} from '@chatxiv/cdm';
import type { FeedbackSubmissionRow } from '../persistence/sqlite/models/feedbackSubmissionRow.js';
import type { FeedbackSubmissionsDao } from '../persistence/sqlite/dao/FeedbackSubmissionsDao.js';
import type { FeedbackService } from './types.js';

function rowToSubmission(row: FeedbackSubmissionRow): FeedbackSubmission {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    messageId: row.message_id,
    rating: row.rating as FeedbackRating,
    reasonCode: row.reason_code as FeedbackReasonCode,
    freeText: row.free_text,
    category: row.category as UsageCategory | null,
    createdAt: row.created_at,
  };
}

/** @param dao - Concrete DAO; the service owns the DAO, DIP applies at the service boundary. */
export function createFeedbackService(dao: FeedbackSubmissionsDao): FeedbackService {
  return {
    submit(idempotencyKey: string, body: FeedbackBody): FeedbackResponse {
      dao.insertOrSkip({
        idempotency_key: idempotencyKey,
        message_id: body.messageId,
        rating: body.rating,
        reason_code: body.reasonCode,
        free_text: body.freeText ?? null,
        category: body.category ?? null,
      });
      return { ok: true };
    },

    list(page: number, pageSize: number): PaginatedResult<FeedbackSubmission> {
      const offset = (page - 1) * pageSize;
      const { rows, total } = dao.listAll(pageSize, offset);
      return { items: rows.map(rowToSubmission), total, page, pageSize };
    },

    getCountByCategory(): FeedbackCountByCategory {
      return dao.getCountByCategory();
    },
  };
}
