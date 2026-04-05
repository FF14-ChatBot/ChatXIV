import { useCallback, useId, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FeedbackReasonCode, UsageCategory } from '@chatxiv/cdm';
import { FEEDBACK_FREE_TEXT_MAX_LENGTH, FeedbackRating, FeedbackReason } from '@chatxiv/cdm';
import { MESSAGE_FEEDBACK_UI_STATE, useMessageFeedback } from '../../hooks/useMessageFeedback';
import styles from './MessageFeedbackBar.module.css';

const REASON_CHOICES: readonly { code: FeedbackReasonCode; label: string }[] = [
  { code: FeedbackReason.WrongAnswer, label: 'Wrong answer' },
  { code: FeedbackReason.Outdated, label: 'Outdated' },
  { code: FeedbackReason.MissingInfo, label: 'Missing info' },
  { code: FeedbackReason.Unrelated, label: 'Unrelated' },
  { code: FeedbackReason.Other, label: 'Other' },
] as const;

interface MessageFeedbackBarProps {
  readonly messageId: string;
  readonly category?: UsageCategory;
}

export function MessageFeedbackBar({ messageId, category }: MessageFeedbackBarProps) {
  const { state, submittedRating, submit, dismissError } = useMessageFeedback(messageId);
  const [pickingReason, setPickingReason] = useState(false);
  const [otherStep, setOtherStep] = useState(false);
  const [otherText, setOtherText] = useState('');
  const otherFieldId = useId();

  const disableInputs =
    state === MESSAGE_FEEDBACK_UI_STATE.Submitting || state === MESSAGE_FEEDBACK_UI_STATE.Submitted;

  const resetNegativeFlow = useCallback(() => {
    setPickingReason(false);
    setOtherStep(false);
    setOtherText('');
  }, []);

  const onThumbsUp = useCallback(() => {
    resetNegativeFlow();
    void submit({ rating: FeedbackRating.Up, reasonCode: FeedbackReason.Other, category });
  }, [submit, category, resetNegativeFlow]);

  const onThumbsDownClick = useCallback(() => {
    if (disableInputs) return;
    setPickingReason((prev) => {
      const next = !prev;
      if (!next) {
        setOtherStep(false);
        setOtherText('');
      }
      return next;
    });
  }, [disableInputs]);

  const onPickReason = useCallback(
    (reasonCode: FeedbackReasonCode) => {
      if (reasonCode === FeedbackReason.Other) {
        setOtherStep(true);
        return;
      }
      resetNegativeFlow();
      void submit({ rating: FeedbackRating.Down, reasonCode, category });
    },
    [submit, category, resetNegativeFlow]
  );

  const onSubmitOther = useCallback(() => {
    const trimmed = otherText.trim();
    if (trimmed.length === 0) return;
    void submit({
      rating: FeedbackRating.Down,
      reasonCode: FeedbackReason.Other,
      category,
      freeText: trimmed,
    });
  }, [submit, category, otherText]);

  const onCancelOther = useCallback(() => {
    setOtherStep(false);
    setOtherText('');
  }, []);

  const otherTextNonEmpty = otherText.trim().length > 0;

  if (state === MESSAGE_FEEDBACK_UI_STATE.Submitted && submittedRating !== null) {
    return (
      <div className={`${styles.metaRow} ${styles.thanksRow}`} role="status" aria-live="polite">
        <span className={styles.status}>
          {submittedRating === FeedbackRating.Up
            ? 'Thanks for the positive feedback!'
            : 'Thanks! We will use this to improve.'}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.metaRow} role="group" aria-label="Rate this assistant response">
      <div className={styles.primaryRow}>
        <div className={styles.feedbackCluster}>
          <button
            type="button"
            className={styles.thumbButton}
            title="Helpful"
            aria-label="Mark this response as helpful"
            aria-pressed={false}
            disabled={disableInputs}
            onClick={onThumbsUp}
          >
            <ThumbsUp size={14} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={`${styles.thumbButton} ${pickingReason || otherStep ? styles.thumbDownActive : ''}`}
            title="Not helpful"
            aria-label="Mark this response as not helpful"
            aria-expanded={pickingReason}
            aria-pressed={pickingReason}
            disabled={disableInputs}
            onClick={onThumbsDownClick}
          >
            <ThumbsDown size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>
        {pickingReason && !disableInputs && !otherStep ? (
          <div className={styles.reasons} role="group" aria-label="Reason for negative feedback">
            {REASON_CHOICES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                className={styles.reasonButton}
                disabled={disableInputs}
                onClick={() => onPickReason(code)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {pickingReason && !disableInputs && otherStep ? (
        <div className={styles.otherPanel} role="group" aria-label="Additional feedback details">
          <label htmlFor={otherFieldId} className={styles.otherLabel}>
            Please describe what went wrong.{' '}
            <span className={styles.otherRequired}>(required)</span>
          </label>
          <textarea
            id={otherFieldId}
            className={styles.otherTextarea}
            value={otherText}
            onChange={(e) => setOtherText(e.target.value.slice(0, FEEDBACK_FREE_TEXT_MAX_LENGTH))}
            maxLength={FEEDBACK_FREE_TEXT_MAX_LENGTH}
            rows={3}
            required
            aria-required="true"
            placeholder="What should we improve?"
            disabled={disableInputs}
          />
          <div className={styles.otherFooter}>
            <span className={styles.otherCount}>
              {otherText.length}/{FEEDBACK_FREE_TEXT_MAX_LENGTH}
            </span>
            <div className={styles.otherActions}>
              <button
                type="button"
                className={styles.otherSecondary}
                onClick={onCancelOther}
                disabled={disableInputs}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.otherSubmit}
                onClick={onSubmitOther}
                disabled={disableInputs || !otherTextNonEmpty}
              >
                Send feedback
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {state === MESSAGE_FEEDBACK_UI_STATE.Error ? (
        <span className={styles.error} role="alert">
          Could not send feedback.
          <button type="button" className={styles.retry} onClick={dismissError}>
            Try again
          </button>
        </span>
      ) : null}
    </div>
  );
}
