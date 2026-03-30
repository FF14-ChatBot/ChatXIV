import type {
  FeedbackBody,
  FeedbackResponse,
  FeedbackSubmission,
  PaginatedResult,
} from '@chatxiv/cdm';

/** Business-level operations over feedback submissions. Routes depend on this interface. */
export interface FeedbackService {
  submit(idempotencyKey: string, body: FeedbackBody): FeedbackResponse;
  list(page: number, pageSize: number): PaginatedResult<FeedbackSubmission>;
  getCountByCategory(): Record<string, number>;
}
