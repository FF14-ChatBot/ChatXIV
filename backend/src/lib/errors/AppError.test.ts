import { describe, it, expect } from 'vitest';
import { AppError } from './AppError.js';
import { ERROR_CODES } from '@chatxiv/cdm';

describe('AppError', () => {
  it('validation() returns 400 VALIDATION_ERROR', () => {
    const err = AppError.validation('Invalid input');
    expect(err.status).toBe(400);
    expect(err.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(err.message).toBe('Invalid input');
  });

  it('rateLimited() returns 429 RATE_LIMITED', () => {
    const err = AppError.rateLimited('Too many requests');
    expect(err.status).toBe(429);
    expect(err.code).toBe(ERROR_CODES.RATE_LIMITED);
  });

  it('sourceUnavailable() returns 503 SOURCE_UNAVAILABLE', () => {
    const err = AppError.sourceUnavailable('Service down');
    expect(err.status).toBe(503);
    expect(err.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
  });

  it('noSourcedAnswer() returns 404 NO_SOURCED_ANSWER', () => {
    const err = AppError.noSourcedAnswer('No answer found');
    expect(err.status).toBe(404);
    expect(err.code).toBe(ERROR_CODES.NO_SOURCED_ANSWER);
  });

  it('refusal() returns 422 REFUSAL', () => {
    const err = AppError.refusal('Request refused');
    expect(err.status).toBe(422);
    expect(err.code).toBe(ERROR_CODES.REFUSAL);
  });

  it('internal() returns 500 INTERNAL_ERROR', () => {
    const err = AppError.internal('Server error');
    expect(err.status).toBe(500);
    expect(err.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it('static factories pass requestId when provided', () => {
    const err = AppError.validation('Bad', 'req-1');
    expect(err.requestId).toBe('req-1');
  });
});
