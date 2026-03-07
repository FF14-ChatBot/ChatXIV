import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import * as expressValidator from 'express-validator';
import { validateMiddleware, validate } from './validate.js';

vi.mock('express-validator', async (importOriginal) => {
  const mod = await importOriginal<typeof import('express-validator')>();
  return {
    ...mod,
    validationResult: vi.fn(),
  };
});

describe('validate', () => {
  describe('validate() helper', () => {
    it('returns an array of the given validation chains plus validateMiddleware as last element', () => {
      const chains = [body('email').isEmail(), body('name').notEmpty()];
      const result = validate(chains);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(chains[0]);
      expect(result[1]).toBe(chains[1]);
      expect(result[2]).toBe(validateMiddleware);
    });

    it('returns only validateMiddleware when given an empty array', () => {
      const result = validate([]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(validateMiddleware);
    });
  });

  describe('validateMiddleware', () => {
    const validationResultMock = vi.mocked(expressValidator.validationResult);

    function createReq(overrides: Partial<Request> = {}): Request {
      return { body: {}, query: {}, params: {}, ...overrides } as Request;
    }

    function createRes() {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;
      return res;
    }

    beforeEach(() => {
      validationResultMock.mockReset();
    });

    it('calls next() when validation result is empty (no errors)', () => {
      validationResultMock.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as unknown as ReturnType<typeof expressValidator.validationResult>);

      const req = createReq();
      const res = createRes();
      const next = vi.fn<NextFunction>();

      validateMiddleware(req, res, next as unknown as NextFunction);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('responds 400 with error and details when validation result has errors', () => {
      const errors = [
        {
          msg: 'Invalid email',
          path: 'body',
          param: 'email',
          location: 'body' as const,
          type: 'field',
        },
      ];
      validationResultMock.mockReturnValue({
        isEmpty: () => false,
        array: () => errors,
      } as unknown as ReturnType<typeof expressValidator.validationResult>);

      const req = createReq();
      const res = createRes();
      const next = vi.fn<NextFunction>();

      validateMiddleware(req, res, next as unknown as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors,
      });
    });
  });
});
