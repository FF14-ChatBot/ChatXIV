import type { Request } from 'express';
import type { AuthResult, AuthStrategy } from './types.js';

const HEADER = 'x-admin-key';

export function createApiKeyAuthStrategy(apiKey: string): AuthStrategy {
  return {
    async authenticate(req: Request): Promise<AuthResult> {
      const provided = req.headers[HEADER];
      if (typeof provided !== 'string' || provided.length === 0) {
        return { authenticated: false };
      }
      return { authenticated: provided === apiKey };
    },
  };
}
