import { describe, it, expect, beforeEach } from 'vitest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createUserDao, type UserDao } from '@src/lib/persistence/sqlite/userDao.js';

describe('userDao', () => {
  let db: SqliteDatabase;
  let dao: UserDao;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    dao = createUserDao(db);
  });

  it('inserts a new user and returns the row', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1', email: 'a@b.com' });
    expect(user.id).toBeTruthy();
    expect(user.iss).toBe('https://issuer');
    expect(user.sub).toBe('sub-1');
    expect(user.email).toBe('a@b.com');
    expect(user.is_admin).toBe(0);
    expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(user.last_login_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('updates existing user on conflict (iss, sub)', () => {
    const first = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1', email: 'old@b.com' });
    const second = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1', email: 'new@b.com' });
    expect(second.id).toBe(first.id);
    expect(second.email).toBe('new@b.com');
  });

  it('preserves is_admin on update', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1' });
    dao.setAdmin(user.id, true);
    const updated = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1', email: 'x@y.com' });
    expect(updated.is_admin).toBe(1);
  });

  it('bootstrapAdmins promotes users with matching subs', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'admin-sub' });
    expect(user.is_admin).toBe(0);
    const promoted = dao.bootstrapAdmins(['admin-sub']);
    expect(promoted).toBe(1);
    expect(dao.findById(user.id)?.is_admin).toBe(1);
  });

  it('bootstrapAdmins returns 0 when no users match', () => {
    dao.upsertUser({ iss: 'https://issuer', sub: 'other-sub' });
    expect(dao.bootstrapAdmins(['nonexistent'])).toBe(0);
  });

  it('bootstrapAdmins skips already-admin users', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'admin-sub' });
    dao.setAdmin(user.id, true);
    expect(dao.bootstrapAdmins(['admin-sub'])).toBe(0);
  });

  it('findById returns the user', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1' });
    expect(dao.findById(user.id)).toBeTruthy();
    expect(dao.findById(user.id)?.sub).toBe('sub-1');
  });

  it('findById returns undefined for unknown id', () => {
    expect(dao.findById('unknown')).toBeUndefined();
  });

  it('findByIssuerSub returns the user', () => {
    dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1' });
    expect(dao.findByIssuerSub('https://issuer', 'sub-1')).toBeTruthy();
  });

  it('findByIssuerSub returns undefined for unknown', () => {
    expect(dao.findByIssuerSub('https://issuer', 'nope')).toBeUndefined();
  });

  it('setAdmin toggles the admin flag', () => {
    const user = dao.upsertUser({ iss: 'https://issuer', sub: 'sub-1' });
    expect(user.is_admin).toBe(0);
    dao.setAdmin(user.id, true);
    expect(dao.findById(user.id)?.is_admin).toBe(1);
    dao.setAdmin(user.id, false);
    expect(dao.findById(user.id)?.is_admin).toBe(0);
  });

  it('stores display_name and avatar_url', () => {
    const user = dao.upsertUser({
      iss: 'https://issuer',
      sub: 'sub-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/pic.png',
    });
    expect(user.display_name).toBe('Alice');
    expect(user.avatar_url).toBe('https://example.com/pic.png');
  });
});
