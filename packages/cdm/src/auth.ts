/** Authenticated user profile returned by GET /v1/auth/me. */
export interface AuthUser {
  readonly id: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly avatarUrl?: string;
  readonly isAdmin: boolean;
}

/** GET /v1/auth/me response shape. */
export interface AuthMeResponse {
  readonly user: AuthUser;
}

/** Base path for auth routes (login, callback, logout, me). */
export const AUTH_BASE_PATH = '/v1/auth' as const;
