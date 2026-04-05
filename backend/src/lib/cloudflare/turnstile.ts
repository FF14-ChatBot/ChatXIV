import { getTurnstileSecretKey } from '../config/env.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyJson = {
  success: boolean;
  'error-codes'?: string[];
};

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; errorCodes: string[]; reason: 'missing_secret' | 'siteverify' };

/**
 * Validates a Turnstile widget token from the client (`cf-turnstile-response` or JSON field).
 * When `TURNSTILE_SECRET_KEY` is unset, verification fails (`missing_secret`) in every environment.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string | undefined
): Promise<TurnstileVerifyResult> {
  const secret = getTurnstileSecretKey();
  if (!secret) {
    return { ok: false, errorCodes: ['missing-secret'], reason: 'missing_secret' };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, errorCodes: ['missing-input-response'], reason: 'siteverify' };
  }

  const body = new URLSearchParams({ secret, response: trimmed });
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as SiteverifyJson;
  if (data.success) {
    return { ok: true };
  }
  return {
    ok: false,
    errorCodes: data['error-codes'] ?? ['unknown'],
    reason: 'siteverify',
  };
}
