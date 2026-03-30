import type { FeedbackBody, FeedbackResponse, PaginatedResult } from '@chatxiv/cdm';
import type { FeedbackSubmissionRow } from '../persistence/sqlite/models/feedbackSubmissionRow.js';

/** Business-level operations over feedback submissions. Routes depend on this interface. */
export interface FeedbackService {
  submit(idempotencyKey: string, body: FeedbackBody): FeedbackResponse;
  list(page: number, pageSize: number): PaginatedResult<FeedbackSubmissionRow>;
  getCountByCategory(): Record<string, number>;
}
