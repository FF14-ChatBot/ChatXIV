import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthMeResponse } from '@chatxiv/cdm';
import '../../../types/express.js';
import type { SqliteDatabase } from '../../../lib/persistence/sqlite/types.js';
import { createUserDao } from '../../../lib/persistence/sqlite/userDao.js';
import { createSessionDao } from '../../../lib/persistence/sqlite/sessionDao.js';
import { generateAuthParams, exchangeCode } from '../../../lib/auth/oidc/oidcClient.js';
import {
  getOidcIssuer,
  getOauthSuccessRedirectUrl,
  isProduction,
} from '../../../lib/config/env.js';
import { SESSION_COOKIE } from '../../../lib/config/constants.js';
import { AppError } from '../../../lib/errors/AppError.js';
import { requestContext } from '../../../lib/request/requestContext.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createAuthRouter(db: SqliteDatabase): Router {
  const router = Router();
  const userDao = createUserDao(db);
  const sessionDao = createSessionDao(db);

  router.get('/login', (_req: Request, res: Response, next: NextFunction): void => {
    const requestId = requestContext.get()?.requestId;

    if (!getOidcIssuer()) {
      next(AppError.internal('OIDC not configured', requestId));
      return;
    }

    generateAuthParams()
      .then(({ redirectUrl }) => {
        res.redirect(redirectUrl.toString());
      })
      .catch(next);
  });

  router.get('/callback', (req: Request, res: Response, next: NextFunction): void => {
    const requestId = requestContext.get()?.requestId;

    const oauthError = req.query.error as string | undefined;
    if (oauthError) {
      const desc = (req.query.error_description as string | undefined) ?? oauthError;
      next(AppError.validation(`OAuth provider denied: ${desc}`, requestId));
      return;
    }

    const protocol = isProduction() ? 'https' : req.protocol;
    const callbackUrl = new URL(`${protocol}://${req.get('host')}${req.originalUrl}`);

    exchangeCode(callbackUrl)
      .then((tokens) => {
        const claims = tokens.claims?.();
        if (!claims || !claims.sub) {
          next(AppError.internal('No sub claim in ID token', requestId));
          return;
        }

        if (!claims.iss) {
          next(AppError.internal('No iss claim in ID token', requestId));
          return;
        }

        const user = userDao.upsertUser({
          iss: claims.iss,
          sub: claims.sub,
          email: (claims.email as string | undefined) ?? undefined,
          displayName: (claims.name as string | undefined) ?? undefined,
          avatarUrl: (claims.picture as string | undefined) ?? undefined,
        });

        const session = sessionDao.createSession({
          userId: user.id,
          expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
          userAgent: req.get('user-agent'),
          ipAddress: req.ip,
        });

        res.cookie(SESSION_COOKIE, session.id, {
          signed: true,
          httpOnly: true,
          secure: isProduction(),
          sameSite: isProduction() ? 'none' : 'lax',
          path: '/',
          maxAge: SESSION_MAX_AGE_MS,
        });

        res.redirect(getOauthSuccessRedirectUrl());
      })
      .catch(next);
  });

  router.post('/logout', (req: Request, res: Response): void => {
    const sid = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
    if (sid) {
      sessionDao.deleteById(sid);
    }
    res.clearCookie(SESSION_COOKIE, {
      path: '/',
      secure: isProduction(),
      sameSite: isProduction() ? 'none' : 'lax',
    });
    res.json({ success: true });
  });

  router.get('/me', (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const requestId = requestContext.get()?.requestId;
      next(AppError.unauthorized('Not authenticated', requestId));
      return;
    }

    const body: AuthMeResponse = { user: req.user };
    res.json(body);
  });

  return router;
}
