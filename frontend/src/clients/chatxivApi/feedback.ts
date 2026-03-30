import type { FeedbackBody, FeedbackResponse } from '@chatxiv/cdm';
import { FEEDBACK_PATH } from '@chatxiv/cdm';
import { HTTP_METHOD } from '../core/httpMethod';
import { chatxivApiRequest } from './instance';
import type { ChatxivApiRequestOptions } from './types';

export type SubmitFeedbackOptions = Omit<ChatxivApiRequestOptions, 'body'> & {
  /** Prefer setting explicitly when retrying the same user action; otherwise a new UUID is used. */
  idempotencyKey?: string;
};

function newIdempotencyKey(): string {
  return crypto.randomUUID?.() ?? `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** POST /v1/feedback — requires `Idempotency-Key` (set automatically unless `idempotencyKey` is passed). */
export async function submitFeedback(
  body: FeedbackBody,
  options?: SubmitFeedbackOptions
): Promise<FeedbackResponse> {
  const { idempotencyKey, headers: extraHeaders, ...rest } = options ?? {};
  const key = idempotencyKey ?? newIdempotencyKey();
  return chatxivApiRequest<FeedbackResponse>(HTTP_METHOD.POST, FEEDBACK_PATH, {
    ...rest,
    body,
    headers: { ...extraHeaders, 'Idempotency-Key': key },
  });
}
