import type { UsageCategory } from './usage.js';

export const FEEDBACK_RATINGS = ['up', 'down'] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

/** Wire-format rating values; use in app code instead of raw strings. */
export const FeedbackRating = {
  Up: 'up',
  Down: 'down',
} as const satisfies { Up: FeedbackRating; Down: FeedbackRating };

export const FEEDBACK_REASON_CODES = [
  'wrong_answer',
  'outdated',
  'missing_info',
  'unrelated',
  'other',
] as const;
export type FeedbackReasonCode = (typeof FEEDBACK_REASON_CODES)[number];

/** Wire-format reason codes; use in app code instead of raw strings. */
export const FeedbackReason = {
  WrongAnswer: 'wrong_answer',
  Outdated: 'outdated',
  MissingInfo: 'missing_info',
  Unrelated: 'unrelated',
  Other: 'other',
} as const satisfies {
  WrongAnswer: FeedbackReasonCode;
  Outdated: FeedbackReasonCode;
  MissingInfo: FeedbackReasonCode;
  Unrelated: FeedbackReasonCode;
  Other: FeedbackReasonCode;
};

export const FEEDBACK_FREE_TEXT_MAX_LENGTH = 500;

/** Request body for `POST /v1/feedback`. */
export interface FeedbackBody {
  readonly messageId: string;
  readonly rating: FeedbackRating;
  readonly reasonCode: FeedbackReasonCode;
  readonly freeText?: string;
  readonly category?: UsageCategory;
}

/** Success response for `POST /v1/feedback` (returned for both new and duplicate submissions). */
export interface FeedbackResponse {
  readonly ok: true;
}

/** Base path for the feedback endpoint (OpenAPI). */
export const FEEDBACK_PATH = '/v1/feedback' as const;
