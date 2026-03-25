import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { AppError } from '@src/lib/errors/AppError.js';
import {
  createOptionalUserMiddleware,
  createRequireUserMiddleware,
  requireAdminMiddleware,
} from '@src/middleware/userAuth.js';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createUserDao } from '@src/lib/persistence/sqlite/userDao.js';
import { createSessionDao } from '@src/lib/persistence/sqlite/sessionDao.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

function createReqRes(overrides: Partial<Request> = {}): {
  req: Request;
  res: Response;
} {
  const req = { signedCookies: {}, ...overrides } as unknown as Request;
  const res = {} as unknown as Response;
  return { req, res };
}

describe('middleware/userAuth', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
  });

  describe('createOptionalUserMiddleware', () => {
    it('calls next() without setting req.user when no cookie', () => {
      const middleware = createOptionalUserMiddleware(db);
      const { req, res } = createReqRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('attaches req.user when valid session exists', () => {
      const userDao = createUserDao(db);
      const sessionDao = createSessionDao(db);
      const user = userDao.upsertUser({ iss: 'https://iss', sub: 'sub-1', email: 'a@b.com' });
      const session = sessionDao.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const middleware = createOptionalUserMiddleware(db);
      const { req, res } = createReqRes({
        signedCookies: { chatxiv_sid: session.id },
      } as unknown as Partial<Request>);
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeTruthy();
      expect(req.user?.id).toBe(user.id);
      expect(req.user?.email).toBe('a@b.com');
    });

    it('does not attach req.user for expired session', () => {
      const userDao = createUserDao(db);
      const sessionDao = createSessionDao(db);
      const user = userDao.upsertUser({ iss: 'https://iss', sub: 'sub-1' });
      const session = sessionDao.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      const middleware = createOptionalUserMiddleware(db);
      const { req, res } = createReqRes({
        signedCookies: { chatxiv_sid: session.id },
      } as unknown as Partial<Request>);
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.user).toBeUndefined();
    });

    it('does not attach req.user for unknown session id', () => {
      const middleware = createOptionalUserMiddleware(db);
      const { req, res } = createReqRes({
        signedCookies: { chatxiv_sid: 'nonexistent' },
      } as unknown as Partial<Request>);
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.user).toBeUndefined();
    });
  });

  describe('createRequireUserMiddleware', () => {
    it('calls next() when req.user is set', () => {
      const middleware = createRequireUserMiddleware();
      const { req, res } = createReqRes();
      req.user = { id: 'u1', isAdmin: false };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('calls next(AppError) when req.user is missing', () => {
      const middleware = createRequireUserMiddleware();
      const { req, res } = createReqRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      const err = next.mock.calls[0][0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.status).toBe(401);
    });
  });

  describe('requireAdminMiddleware', () => {
    it('calls next() when req.user.isAdmin is true', () => {
      const { req, res } = createReqRes();
      req.user = { id: 'u1', isAdmin: true };
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('returns 401 when not logged in', () => {
      const { req, res } = createReqRes();
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      const err = next.mock.calls[0][0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.status).toBe(401);
    });

    it('returns 403 when logged in but not admin', () => {
      const { req, res } = createReqRes();
      req.user = { id: 'u1', isAdmin: false };
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      const err = next.mock.calls[0][0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.status).toBe(403);
    });
  });
});
