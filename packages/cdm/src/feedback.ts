export const FEEDBACK_RATINGS = ['up', 'down'] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_REASON_CODES = [
  'wrong_answer',
  'outdated',
  'missing_info',
  'other',
] as const;
export type FeedbackReasonCode = (typeof FEEDBACK_REASON_CODES)[number];

export const FEEDBACK_FREE_TEXT_MAX_LENGTH = 500;

/** Request body for `POST /v1/feedback`. */
export interface FeedbackBody {
  readonly messageId: string;
  readonly rating: FeedbackRating;
  readonly reasonCode?: FeedbackReasonCode;
  readonly freeText?: string;
  readonly category?: string;
}

/** Success response for `POST /v1/feedback` (returned for both new and duplicate submissions). */
export interface FeedbackResponse {
  readonly ok: true;
}

/** Base path for the feedback endpoint (OpenAPI). */
export const FEEDBACK_PATH = '/v1/feedback' as const;
