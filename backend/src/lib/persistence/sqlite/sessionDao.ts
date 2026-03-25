import crypto from 'node:crypto';
import type { SqliteDatabase } from './types.js';

export interface SessionRow {
  id: string;
  user_id: string;
  /** ISO 8601 UTC string. */
  expires_at: string;
  /** ISO 8601 UTC string. */
  created_at: string;
  user_agent: string | null;
  ip_address: string | null;
}

export interface CreateSessionParams {
  userId: string;
  /** ISO 8601 UTC string. */
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionDao {
  createSession(params: CreateSessionParams): SessionRow;
  findById(id: string): SessionRow | undefined;
  deleteById(id: string): void;
  deleteByUserId(userId: string): void;
  deleteExpired(): number;
}

export function createSessionDao(db: SqliteDatabase): SessionDao {
  const insertStmt = db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const findByIdStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');

  const deleteByIdStmt = db.prepare('DELETE FROM sessions WHERE id = ?');

  const deleteByUserIdStmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');

  const deleteExpiredStmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');

  return {
    createSession(params: CreateSessionParams): SessionRow {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      insertStmt.run(
        id,
        params.userId,
        params.expiresAt,
        now,
        params.userAgent ?? null,
        params.ipAddress ?? null
      );
      return findByIdStmt.get(id) as unknown as SessionRow;
    },

    findById(id: string): SessionRow | undefined {
      return findByIdStmt.get(id) as unknown as SessionRow | undefined;
    },

    deleteById(id: string): void {
      deleteByIdStmt.run(id);
    },

    deleteByUserId(userId: string): void {
      deleteByUserIdStmt.run(userId);
    },

    deleteExpired(): number {
      const result = deleteExpiredStmt.run(new Date().toISOString());
      return Number(result.changes);
    },
  };
}
