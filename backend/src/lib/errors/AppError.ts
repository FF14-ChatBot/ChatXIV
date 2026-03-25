import { ERROR_CODES, type ErrorCode } from '@chatxiv/cdm';
import type { NormalizableError } from './types.js';

export class AppError extends Error implements NormalizableError {
  readonly status: number;
  readonly code: ErrorCode;
  readonly requestId?: string;

  constructor(status: number, code: ErrorCode, message: string, requestId?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message: string, requestId?: string): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message, requestId);
  }

  static forbidden(message: string, requestId?: string): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message, requestId);
  }

  static validation(message: string, requestId?: string): AppError {
    return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, requestId);
  }

  static rateLimited(message: string, requestId?: string): AppError {
    return new AppError(429, ERROR_CODES.RATE_LIMITED, message, requestId);
  }

  static requestTimeout(message: string, requestId?: string): AppError {
    return new AppError(408, ERROR_CODES.REQUEST_TIMEOUT, message, requestId);
  }

  static payloadTooLarge(message: string, requestId?: string): AppError {
    return new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, message, requestId);
  }

  static sourceUnavailable(message: string, requestId?: string): AppError {
    return new AppError(503, ERROR_CODES.SOURCE_UNAVAILABLE, message, requestId);
  }

  static noSourcedAnswer(message: string, requestId?: string): AppError {
    return new AppError(404, ERROR_CODES.NO_SOURCED_ANSWER, message, requestId);
  }

  static refusal(message: string, requestId?: string): AppError {
    return new AppError(422, ERROR_CODES.REFUSAL, message, requestId);
  }

  static internal(message: string, requestId?: string): AppError {
    return new AppError(500, ERROR_CODES.INTERNAL_ERROR, message, requestId);
  }
}
