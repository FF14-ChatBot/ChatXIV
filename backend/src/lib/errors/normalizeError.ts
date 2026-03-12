import { ERROR_CODES } from '@chatxiv/cdm';
import type { ApiErrorResponse } from '@chatxiv/cdm';
import { isNormalizableError } from './types.js';

const FALLBACK_MESSAGE = 'An unexpected error occurred';

export interface NormalizeErrorOptions {
  requestId?: string;
  includeStack: boolean;
  /** When true, unknown errors get a generic message only (no internal details in response). */
  isProduction?: boolean;
}

export interface NormalizeErrorResult {
  status: number;
  body: ApiErrorResponse;
}

export function normalizeError(err: unknown, options: NormalizeErrorOptions): NormalizeErrorResult {
  const { requestId, includeStack, isProduction = false } = options;

  if (isNormalizableError(err)) {
    const body: ApiErrorResponse = {
      code: err.code,
      message: err.message,
      ...((requestId ?? err.requestId) ? { requestId: requestId ?? err.requestId } : {}),
      ...(includeStack && err instanceof Error && err.stack ? { stack: err.stack } : {}),
    };
    return { status: err.status, body };
  }

  const message = isProduction
    ? FALLBACK_MESSAGE
    : err instanceof Error
      ? err.message
      : FALLBACK_MESSAGE;
  const body: ApiErrorResponse = {
    code: ERROR_CODES.INTERNAL_ERROR,
    message,
    ...(requestId ? { requestId } : {}),
    ...(includeStack && err instanceof Error && err.stack ? { stack: err.stack } : {}),
  };
  return { status: 500, body };
}
