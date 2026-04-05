import type { Request, Response, NextFunction } from 'express';
import type { SqliteDatabase } from '../lib/persistence/sqlite/types.js';
import '../types/express.js';
import { SESSION_COOKIE } from '../lib/config/constants.js';
import { createUserDao } from '../lib/persistence/sqlite/userDao.js';
import { createSessionDao } from '../lib/persistence/sqlite/sessionDao.js';
import { AppError } from '../lib/errors/AppError.js';
import { requestContext } from '../lib/request/requestContext.js';

/**
 * Reads the signed session cookie, loads user from SQLite, and attaches
 * `req.user` when valid. Never errors on missing/invalid/expired sessions.
 */
export function createOptionalUserMiddleware(
  db: SqliteDatabase
): (req: Request, res: Response, next: NextFunction) => void {
  const sessionDao = createSessionDao(db);
  const userDao = createUserDao(db);

  return (req: Request, _res: Response, next: NextFunction): void => {
    const sid = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
    if (!sid) {
      next();
      return;
    }

    const session = sessionDao.findById(sid);
    if (!session || session.expires_at < new Date().toISOString()) {
      next();
      return;
    }

    const user = userDao.findById(session.user_id);
    if (!user) {
      next();
      return;
    }

    req.user = {
      id: user.id,
      email: user.email ?? undefined,
      displayName: user.display_name ?? undefined,
      avatarUrl: user.avatar_url ?? undefined,
      isAdmin: user.is_admin === 1,
    };

    next();
  };
}

/** Returns 401 if `req.user` is not set. */
export function createRequireUserMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const requestId = requestContext.get()?.requestId;
      next(AppError.unauthorized('Authentication required', requestId));
      return;
    }
    next();
  };
}

/** Returns 401 if not logged in, 403 if logged in but not admin. */
export function requireAdminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = requestContext.get()?.requestId;

  if (!req.user) {
    next(AppError.unauthorized('Authentication required', requestId));
    return;
  }

  if (!req.user.isAdmin) {
    next(AppError.forbidden('Admin access required', requestId));
    return;
  }

  next();
}
