import { describe, it, expect } from 'vitest';
import { normalizeError } from './normalizeError.js';
import { AppError } from './AppError.js';
import { ERROR_CODES } from '@chatxiv/cdm';

describe('normalizeError', () => {
  it('maps AppError to status and body with code and message', () => {
    const err = new AppError(429, ERROR_CODES.RATE_LIMITED, 'Too many requests');
    const { status, body } = normalizeError(err, { includeStack: false });

    expect(status).toBe(429);
    expect(body.code).toBe(ERROR_CODES.RATE_LIMITED);
    expect(body.message).toBe('Too many requests');
    expect(body.stack).toBeUndefined();
  });

  it('attaches requestId when provided in options', () => {
    const err = new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Bad input');
    const { body } = normalizeError(err, {
      includeStack: false,
      requestId: 'req-123',
    });

    expect(body.requestId).toBe('req-123');
  });

  it('includes stack when includeStack is true and error has stack', () => {
    const err = new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Oops');
    const { body } = normalizeError(err, { includeStack: true });

    expect(body.stack).toBeDefined();
    expect(typeof body.stack).toBe('string');
  });

  it('maps unknown Error to 500 and INTERNAL_ERROR', () => {
    const err = new Error('Something broke');
    const { status, body } = normalizeError(err, { includeStack: false });

    expect(status).toBe(500);
    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.message).toBe('Something broke');
  });

  it('maps non-Error throw to 500 with fallback message', () => {
    const { status, body } = normalizeError('string error', { includeStack: false });

    expect(status).toBe(500);
    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.message).toBe('An unexpected error occurred');
  });

  it('in production hides internal message for unknown errors', () => {
    const err = new Error('Internal DB detail');
    const { body } = normalizeError(err, {
      includeStack: false,
      isProduction: true,
    });

    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.message).toBe('An unexpected error occurred');
  });

  it('accepts normalizable plain object (status, code, message)', () => {
    const err = {
      status: 503,
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
      message: 'Service down',
    };
    const { status, body } = normalizeError(err, { includeStack: false });

    expect(status).toBe(503);
    expect(body.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
    expect(body.message).toBe('Service down');
  });

  it('uses err.requestId when options.requestId not provided (normalizable)', () => {
    const err = new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Bad', 'from-err');
    const { body } = normalizeError(err, { includeStack: false });
    expect(body.requestId).toBe('from-err');
  });

  it('includes stack for unknown Error when includeStack true', () => {
    const err = new Error('Unknown');
    const { body } = normalizeError(err, { includeStack: true });
    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.stack).toBeDefined();
  });
});
