import type { Request } from 'express';
import type { AuthResult, AuthStrategy } from './types.js';

const HEADER = 'x-admin-key';

function readHeaderValue(req: Request): string | undefined {
  const raw = req.headers[HEADER];
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (typeof first !== 'string') return undefined;
    const t = first.trim();
    return t === '' ? undefined : t;
  }
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t === '' ? undefined : t;
}

/** Resolves the expected admin secret on each request (avoids stale DI factory capture). */
export type AdminApiKeyProvider = () => string;

export function createApiKeyAuthStrategy(getExpectedKey: AdminApiKeyProvider): AuthStrategy {
  return {
    async authenticate(req: Request): Promise<AuthResult> {
      const expected = getExpectedKey().trim();
      const provided = readHeaderValue(req);
      if (provided === undefined) {
        return { authenticated: false };
      }
      return { authenticated: provided === expected };
    },
  };
}
