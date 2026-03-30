import { useCallback, useState } from 'react';
import type { FeedbackBody, FeedbackRating } from '@chatxiv/cdm';
import { submitFeedback } from '../clients/chatxivApi/feedback';
import { logger } from '../lib/logger/instance';
import type { ChatxivApiConfig } from '../clients/chatxivApi/types';

export type MessageFeedbackUiState = 'idle' | 'submitting' | 'submitted' | 'error';

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
  const [state, setState] = useState<MessageFeedbackUiState>('idle');
  const [submittedRating, setSubmittedRating] = useState<FeedbackRating | null>(null);

  const dismissError = useCallback(() => {
    setState('idle');
  }, []);

  const submit = useCallback(
    async (payload: Omit<FeedbackBody, 'messageId'>, apiConfig?: ChatxivApiConfig) => {
      setState('submitting');
      try {
        await submitFeedback(
          { ...payload, messageId },
          apiConfig ? { config: apiConfig } : undefined
        );
        setSubmittedRating(payload.rating);
        setState('submitted');
      } catch (e) {
        logger.error('Feedback submission failed', {
          messageId,
          error: e instanceof Error ? e.message : String(e),
        });
        setState('error');
      }
    },
    [messageId]
  );

  return { state, submittedRating, submit, dismissError };
}
