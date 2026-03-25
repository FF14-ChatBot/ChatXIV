import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../errors/AppError.js';

const AUTH_STATE_MAX_AGE_MS = 600_000;

export interface PkceStatePayload {
  readonly v: string;
  readonly t: number;
}

/**
 * Packs PKCE code_verifier into the OAuth `state` param with an HMAC so the callback
 * does not rely on cookies. That avoids failures when login is opened on one host
 * (e.g. tunnel API) and `OIDC_REDIRECT_URI` sends the IdP back to another (e.g. localhost).
 */
export function encodePkceState(
  codeVerifier: string,
  secret: string,
  nowMs: number = Date.now()
): string {
  const payload: PkceStatePayload = { v: codeVerifier, t: nowMs };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = sig.toString('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function decodePkceState(state: string, secret: string, nowMs: number = Date.now()): string {
  const dot = state.lastIndexOf('.');
  if (dot < 1) {
    throw AppError.validation('Invalid OAuth state');
  }
  const payloadB64 = state.slice(0, dot);
  const sigB64 = state.slice(dot + 1);
  if (!payloadB64 || !sigB64) {
    throw AppError.validation('Invalid OAuth state');
  }

  let sig: Buffer;
  try {
    sig = Buffer.from(sigB64, 'base64url');
  } catch {
    throw AppError.validation('Invalid OAuth state');
  }

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  if (sig.length !== expectedSig.length || !timingSafeEqual(sig, expectedSig)) {
    throw AppError.validation('Invalid OAuth state');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw AppError.validation('Malformed OAuth state');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('v' in parsed) ||
    !('t' in parsed) ||
    typeof (parsed as PkceStatePayload).v !== 'string' ||
    typeof (parsed as PkceStatePayload).t !== 'number'
  ) {
    throw AppError.validation('Malformed OAuth state');
  }

  const { v: codeVerifier, t: issuedAt } = parsed as PkceStatePayload;
  if (nowMs - issuedAt > AUTH_STATE_MAX_AGE_MS || issuedAt > nowMs + 60_000) {
    throw AppError.validation('OAuth state expired');
  }

  return codeVerifier;
}
