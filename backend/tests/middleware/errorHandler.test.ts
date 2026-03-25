import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '@src/middleware/errorHandler.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { ERROR_CODES } from '@chatxiv/cdm';
import { requestContext } from '@src/lib/request/requestContext.js';
import { logger } from '@src/lib/observability/logger.js';

describe('errorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = {} as Request;
    res = {
      headersSent: false,
      locals: {},
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    next = vi.fn();
    vi.spyOn(requestContext, 'get').mockReturnValue({
      requestId: 'test-req-id',
      sessionId: undefined,
    });
  });

  it('sends status and JSON body for AppError', () => {
    const err = new AppError(429, ERROR_CODES.RATE_LIMITED, 'Too many requests');
    const handler = errorHandler({ isProduction: true });

    handler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests',
        requestId: 'test-req-id',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('sends 500 and INTERNAL_ERROR for unknown Error', () => {
    const err = new Error('Unexpected');
    const handler = errorHandler({ isProduction: true });

    handler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      })
    );
  });

  it('does not send stack in production', () => {
    const err = new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Fail');
    const handler = errorHandler({ isProduction: true });

    handler(err, req, res, next);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ stack: expect.anything() })
    );
  });

  it('does not call res.status().json() if headers already sent', () => {
    const err = new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Bad');
    const handler = errorHandler();
    (res as Response & { headersSent: boolean }).headersSent = true;

    handler(err, req, res, next);

    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('logs warn when requestId is missing', () => {
    vi.mocked(requestContext.get).mockReturnValue(undefined);
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const err = new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Fail');
    const handler = errorHandler({ isProduction: true });

    handler(err, req, res, next);

    expect(warnSpy).toHaveBeenCalledWith(
      { err },
      'Error handled without requestId (request context missing)'
    );
    warnSpy.mockRestore();
  });
});
