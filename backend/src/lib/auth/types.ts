import type { Request } from 'express';

export interface AuthResult {
  readonly authenticated: boolean;
}

/**
 * Strategy for authenticating incoming requests.
 */
export interface AuthStrategy {
  authenticate(req: Request): Promise<AuthResult>;
}
