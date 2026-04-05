import { useCallback, useState } from 'react';
import type { FeedbackBody, FeedbackRating } from '@chatxiv/cdm';
import { submitFeedback } from '../clients/chatxivApi/feedback';
import { logger } from '../lib/logger/instance';
import type { ChatxivApiConfig } from '../clients/chatxivApi/types';

export const MESSAGE_FEEDBACK_UI_STATE = {
  Idle: 'idle',
  Submitting: 'submitting',
  Submitted: 'submitted',
  Error: 'error',
} as const;
export type MessageFeedbackUiState =
  (typeof MESSAGE_FEEDBACK_UI_STATE)[keyof typeof MESSAGE_FEEDBACK_UI_STATE];

export interface UseMessageFeedbackResult {
  readonly state: MessageFeedbackUiState;
  /** Rating recorded after a successful submit. */
  readonly submittedRating: FeedbackRating | null;
  /** Submit feedback for this hook's `messageId` (omitted from `payload`). */
  submit: (payload: Omit<FeedbackBody, 'messageId'>, apiConfig?: ChatxivApiConfig) => Promise<void>;
  /** Clear error so the user can retry (generates a new idempotency key on next submit). */
  dismissError: () => void;
}

/**
 * Tracks submit state for `POST /v1/feedback` tied to one assistant message.
 * Each successful submit freezes the control; use one hook instance per message row.
 */
export function useMessageFeedback(messageId: string): UseMessageFeedbackResult {
  const [state, setState] = useState<MessageFeedbackUiState>(MESSAGE_FEEDBACK_UI_STATE.Idle);
  const [submittedRating, setSubmittedRating] = useState<FeedbackRating | null>(null);

  const dismissError = useCallback(() => {
    setState(MESSAGE_FEEDBACK_UI_STATE.Idle);
  }, []);

  const submit = useCallback(
    async (payload: Omit<FeedbackBody, 'messageId'>, apiConfig?: ChatxivApiConfig) => {
      setState(MESSAGE_FEEDBACK_UI_STATE.Submitting);
      try {
        await submitFeedback(
          { ...payload, messageId },
          apiConfig ? { config: apiConfig } : undefined
        );
        setSubmittedRating(payload.rating);
        setState(MESSAGE_FEEDBACK_UI_STATE.Submitted);
      } catch (e) {
        logger.error('Feedback submission failed', {
          messageId,
          error: e instanceof Error ? e.message : String(e),
        });
        setState(MESSAGE_FEEDBACK_UI_STATE.Error);
      }
    },
    [messageId]
  );

  return { state, submittedRating, submit, dismissError };
}
