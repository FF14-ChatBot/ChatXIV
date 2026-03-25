import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createAuthRouter } from '@src/routes/v1/auth/router.js';
import { createOptionalUserMiddleware } from '@src/middleware/userAuth.js';
import { createUserDao } from '@src/lib/persistence/sqlite/userDao.js';
import { createSessionDao } from '@src/lib/persistence/sqlite/sessionDao.js';
import { errorHandler } from '@src/middleware/errorHandler.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

vi.mock('@src/lib/config/env.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@src/lib/config/env.js')>();
  return {
    ...orig,
    getOidcIssuer: vi.fn().mockReturnValue('https://accounts.google.com'),
    getOidcClientId: vi.fn().mockReturnValue('client-id'),
    getOidcClientSecret: vi.fn().mockReturnValue('client-secret'),
    getOidcRedirectUri: vi.fn().mockReturnValue('http://localhost:3000/v1/auth/callback'),
    getSessionSecret: vi.fn().mockReturnValue('test-cookie-secret'),
    getOauthSuccessRedirectUrl: vi.fn().mockReturnValue('http://localhost:5173/'),
    isProduction: vi.fn().mockReturnValue(false),
  };
});

const COOKIE_SECRET = 'test-cookie-secret';

vi.mock('@src/lib/auth/oidc/oidcClient.js', () => ({
  generateAuthParams: vi.fn().mockResolvedValue({
    redirectUrl: new URL('https://idp.example.com/authorize?state=s1'),
  }),
  exchangeCode: vi.fn().mockResolvedValue({
    claims: () => ({
      iss: 'https://accounts.google.com',
      sub: 'test-sub',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.png',
    }),
  }),
}));

function buildApp(db: SqliteDatabase) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use(createOptionalUserMiddleware(db));
  app.use('/v1/auth', createAuthRouter(db));
  app.use(errorHandler({ isProduction: false }));
  return app;
}

describe('auth router', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
  });

  describe('GET /v1/auth/me', () => {
    it('returns 401 when no session cookie', async () => {
      const res = await request(buildApp(db)).get('/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns user when valid session exists', async () => {
      const userDao = createUserDao(db);
      const sessionDao = createSessionDao(db);
      const user = userDao.upsertUser({
        iss: 'https://iss',
        sub: 'sub-1',
        email: 'a@b.com',
        displayName: 'Alice',
      });
      const session = sessionDao.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const app = buildApp(db);

      const cookieModule = await import('cookie-signature');
      const signed = 's:' + cookieModule.sign(session.id, COOKIE_SECRET);
      const cookieStr = `chatxiv_sid=${encodeURIComponent(signed)}`;

      const res = await request(app).get('/v1/auth/me').set('Cookie', cookieStr);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.email).toBe('a@b.com');
      expect(res.body.user.displayName).toBe('Alice');
    });
  });

  describe('GET /v1/auth/login', () => {
    it('redirects to the IdP authorization URL', async () => {
      const res = await request(buildApp(db)).get('/v1/auth/login');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('idp.example.com');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('clears session and returns success', async () => {
      const userDao = createUserDao(db);
      const sessionDao = createSessionDao(db);
      const user = userDao.upsertUser({ iss: 'https://iss', sub: 'sub-1' });
      const session = sessionDao.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const app = buildApp(db);

      const cookieModule = await import('cookie-signature');
      const signed = 's:' + cookieModule.sign(session.id, COOKIE_SECRET);
      const cookieStr = `chatxiv_sid=${encodeURIComponent(signed)}`;

      const res = await request(app).post('/v1/auth/logout').set('Cookie', cookieStr);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(sessionDao.findById(session.id)).toBeUndefined();
    });

    it('returns success even without a session cookie', async () => {
      const res = await request(buildApp(db)).post('/v1/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/auth/callback', () => {
    it('creates session and redirects on valid callback', async () => {
      const app = buildApp(db);

      const res = await request(app).get('/v1/auth/callback?code=abc&state=s1');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('http://localhost:5173/');

      const cookies = res.headers['set-cookie'] as string[];
      const sessionCookie = cookies?.find((c: string) => c.includes('chatxiv_sid'));
      expect(sessionCookie).toBeTruthy();
    });

    it('returns 400 when IdP sends an error param (e.g. access_denied)', async () => {
      const res = await request(buildApp(db)).get(
        '/v1/auth/callback?error=access_denied&error_description=User+denied+consent'
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('User denied consent');
    });

    it('returns 400 with error code when no description is provided', async () => {
      const res = await request(buildApp(db)).get('/v1/auth/callback?error=server_error');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('server_error');
    });
  });
});
