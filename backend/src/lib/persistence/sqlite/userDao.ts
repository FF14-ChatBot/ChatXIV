import crypto from 'node:crypto';
import type { SqliteDatabase } from './types.js';

export interface UserRow {
  id: string;
  iss: string;
  sub: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: number;
  /** ISO 8601 UTC string. */
  created_at: string;
  /** ISO 8601 UTC string. */
  last_login_at: string;
}

export interface UpsertUserParams {
  iss: string;
  sub: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface UserDao {
  upsertUser(params: UpsertUserParams): UserRow;
  findById(id: string): UserRow | undefined;
  findByIssuerSub(iss: string, sub: string): UserRow | undefined;
  setAdmin(id: string, isAdmin: boolean): void;
  bootstrapAdmins(subs: readonly string[]): number;
}

function resolveIsAdmin(params: UpsertUserParams, existing: UserRow | undefined): 0 | 1 {
  if (params.isAdmin) return 1;
  if (existing) return existing.is_admin as 0 | 1;
  return 0;
}

export function createUserDao(db: SqliteDatabase): UserDao {
  const insertStmt = db.prepare(
    `INSERT INTO users (id, iss, sub, email, display_name, avatar_url, is_admin, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(iss, sub) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       last_login_at = excluded.last_login_at`
  );

  const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');

  const findByIssuerSubStmt = db.prepare('SELECT * FROM users WHERE iss = ? AND sub = ?');

  const setAdminStmt = db.prepare('UPDATE users SET is_admin = ? WHERE id = ?');

  const bootstrapAdminStmt = db.prepare(
    'UPDATE users SET is_admin = 1 WHERE sub = ? AND is_admin = 0'
  );

  return {
    upsertUser(params: UpsertUserParams): UserRow {
      const now = new Date().toISOString();

      const existing = findByIssuerSubStmt.get(params.iss, params.sub) as unknown as
        | UserRow
        | undefined;

      const id = existing?.id ?? crypto.randomUUID();
      const isAdmin = resolveIsAdmin(params, existing);

      insertStmt.run(
        id,
        params.iss,
        params.sub,
        params.email ?? null,
        params.displayName ?? null,
        params.avatarUrl ?? null,
        isAdmin,
        now,
        now
      );

      return findByIssuerSubStmt.get(params.iss, params.sub) as unknown as UserRow;
    },

    findById(id: string): UserRow | undefined {
      return findByIdStmt.get(id) as unknown as UserRow | undefined;
    },

    findByIssuerSub(iss: string, sub: string): UserRow | undefined {
      return findByIssuerSubStmt.get(iss, sub) as unknown as UserRow | undefined;
    },

    setAdmin(id: string, isAdmin: boolean): void {
      setAdminStmt.run(isAdmin ? 1 : 0, id);
    },

    bootstrapAdmins(subs: readonly string[]): number {
      let promoted = 0;
      for (const sub of subs) {
        const result = bootstrapAdminStmt.run(sub);
        promoted += Number(result.changes);
      }
      return promoted;
    },
  };
}
