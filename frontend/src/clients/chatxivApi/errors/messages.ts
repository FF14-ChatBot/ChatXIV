import { ERROR_CODES, type ErrorCode } from '@chatxiv/cdm';

/** Safe messages for UI; don’t show raw API message to the user. */
export const ERROR_CODE_TO_MESSAGE: Readonly<Record<ErrorCode, string>> = {
  [ERROR_CODES.VALIDATION_ERROR]: "Your message couldn't be processed. Please try again.",
  [ERROR_CODES.RATE_LIMITED]: "You've reached the limit for now; please try again later.",
  [ERROR_CODES.REQUEST_TIMEOUT]: 'Request took too long; please try again.',
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 'Request is too large. Please try again.',
  [ERROR_CODES.SOURCE_UNAVAILABLE]: 'Source temporarily unavailable.',
  [ERROR_CODES.NO_SOURCED_ANSWER]: "I couldn't find a sourced answer for that.",
  [ERROR_CODES.REFUSAL]: "I can't help with that.",
  [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong. Please try again.',
};

export const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export function getDisplayMessage(code?: string): string {
  if (code && code in ERROR_CODE_TO_MESSAGE) {
    return ERROR_CODE_TO_MESSAGE[code as ErrorCode];
  }
  return FALLBACK_MESSAGE;
}
