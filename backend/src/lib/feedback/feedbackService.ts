import type { FeedbackBody, FeedbackResponse, PaginatedResult } from '@chatxiv/cdm';
import type { FeedbackSubmissionRow } from '../persistence/sqlite/models/feedbackSubmissionRow.js';
import type { FeedbackSubmissionsDao } from '../persistence/sqlite/dao/FeedbackSubmissionsDao.js';
import type { FeedbackService } from './types.js';

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

    list(page: number, pageSize: number): PaginatedResult<FeedbackSubmissionRow> {
      const offset = (page - 1) * pageSize;
      const { rows, total } = dao.listAll(pageSize, offset);
      return { items: rows, total, page, pageSize };
    },

    getCountByCategory(): Record<string, number> {
      return dao.getCountByCategory();
    },
  };
}
