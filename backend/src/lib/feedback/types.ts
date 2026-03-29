import type { FeedbackBody, FeedbackResponse } from '@chatxiv/cdm';
import type { FeedbackSubmissionRow } from '../persistence/sqlite/models/feedbackSubmissionRow.js';

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/** Business-level operations over feedback submissions. Routes depend on this interface. */
export interface FeedbackService {
  submit(idempotencyKey: string, body: FeedbackBody): FeedbackResponse;
  list(page: number, pageSize: number): PaginatedResult<FeedbackSubmissionRow>;
  getCountByCategory(): Record<string, number>;
}
