import { describe, it, expect } from 'vitest';
import { encodePkceState, decodePkceState } from '@src/lib/auth/oidc/pkceState.js';
import { AppError } from '@src/lib/errors/AppError.js';

describe('pkceState', () => {
  const secret = 'unit-test-hmac-secret-at-least-32-chars';

  it('round-trips code_verifier', () => {
    const verifier = 'pkce-verifier-abc123';
    const now = 1_700_000_000_000;
    const state = encodePkceState(verifier, secret, now);
    expect(decodePkceState(state, secret, now)).toBe(verifier);
  });

  it('rejects tampered payload', () => {
    const state = encodePkceState('v1', secret);
    const parts = state.split('.');
    parts[0] = Buffer.from(JSON.stringify({ v: 'evil', t: Date.now() }), 'utf8').toString(
      'base64url'
    );
    const tampered = parts.join('.');
    expect(() => decodePkceState(tampered, secret)).toThrow(AppError);
  });

  it('rejects expired state', () => {
    const old = Date.now() - 700_000;
    const state = encodePkceState('v1', secret, old);
    expect(() => decodePkceState(state, secret)).toThrow(AppError);
  });

  it('rejects state signed with a different secret', () => {
    const state = encodePkceState('v1', secret);
    expect(() => decodePkceState(state, 'wrong-secret-that-is-long-enough')).toThrow(AppError);
  });

  it('rejects state with future timestamp beyond skew tolerance', () => {
    const futureMs = Date.now() + 120_000;
    const state = encodePkceState('v1', secret, futureMs);
    expect(() => decodePkceState(state, secret)).toThrow(AppError);
  });

  it('round-trips empty-string verifier', () => {
    const now = Date.now();
    const state = encodePkceState('', secret, now);
    expect(decodePkceState(state, secret, now)).toBe('');
  });

  it('rejects malformed state', () => {
    expect(() => decodePkceState('no-dot', secret)).toThrow(AppError);
  });
});
