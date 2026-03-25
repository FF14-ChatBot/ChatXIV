import { describe, it, expect, beforeEach } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createSessionDao, type SessionDao } from '@src/lib/persistence/sqlite/sessionDao.js';
import { createUserDao, type UserDao } from '@src/lib/persistence/sqlite/userDao.js';

describe('sessionDao', () => {
  let db: SqliteDatabase;
  let sessionDao: SessionDao;
  let userDao: UserDao;
  let userId: string;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    sessionDao = createSessionDao(db);
    userDao = createUserDao(db);
    const user = userDao.upsertUser({ iss: 'https://issuer', sub: 'sub-1' });
    userId = user.id;
  });

  it('creates a session and returns the row', () => {
    const session = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      userAgent: 'TestBrowser/1.0',
      ipAddress: '127.0.0.1',
    });
    expect(session.id).toBeTruthy();
    expect(session.user_id).toBe(userId);
    expect(session.user_agent).toBe('TestBrowser/1.0');
    expect(session.ip_address).toBe('127.0.0.1');
    expect(session.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(session.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('findById returns the session', () => {
    const session = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const found = sessionDao.findById(session.id);
    expect(found).toBeTruthy();
    expect(found?.user_id).toBe(userId);
  });

  it('findById returns undefined for unknown id', () => {
    expect(sessionDao.findById('nonexistent')).toBeUndefined();
  });

  it('deleteById removes the session', () => {
    const session = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    sessionDao.deleteById(session.id);
    expect(sessionDao.findById(session.id)).toBeUndefined();
  });

  it('deleteByUserId removes all sessions for a user', () => {
    const s1 = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const s2 = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    sessionDao.deleteByUserId(userId);
    expect(sessionDao.findById(s1.id)).toBeUndefined();
    expect(sessionDao.findById(s2.id)).toBeUndefined();
  });

  it('deleteExpired removes only expired sessions', () => {
    const active = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const expired = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const count = sessionDao.deleteExpired();
    expect(count).toBe(1);
    expect(sessionDao.findById(active.id)).toBeTruthy();
    expect(sessionDao.findById(expired.id)).toBeUndefined();
  });

  it('stores null for optional fields', () => {
    const session = sessionDao.createSession({
      userId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(session.user_agent).toBeNull();
    expect(session.ip_address).toBeNull();
  });
});
