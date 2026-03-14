import type { ApiErrorResponse } from '@chatxiv/cdm';
import { getDisplayMessage } from './messages';

/** Thrown on 4xx/5xx or network failure; displayMessage is safe to show in the UI. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly displayMessage: string;
  readonly requestId?: string;
  readonly status?: number;
  readonly body?: ApiErrorResponse;

  constructor(
    code: string,
    displayMessage: string,
    options?: {
      requestId?: string;
      status?: number;
      body?: ApiErrorResponse;
    }
  ) {
    super(displayMessage);
    this.name = 'ApiClientError';
    this.code = code;
    this.displayMessage = displayMessage;
    this.requestId = options?.requestId;
    this.status = options?.status;
    this.body = options?.body;
  }

  static fromCode(
    code: string,
    options?: { requestId?: string; status?: number; body?: ApiErrorResponse }
  ): ApiClientError {
    return new ApiClientError(code, getDisplayMessage(code), options);
  }
}
