/** Row shape for `feedback_submissions` queries (snake_case columns). */
export interface FeedbackSubmissionRow {
  id: number;
  idempotency_key: string;
  message_id: string;
  rating: string;
  reason_code: string;
  free_text: string | null;
  category: string | null;
  created_at: string;
}
