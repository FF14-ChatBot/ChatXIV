import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodePkceState } from '@src/lib/auth/oidc/pkceState.js';

vi.mock('openid-client', () => ({
  discovery: vi.fn().mockResolvedValue({ serverMetadata: () => ({}) }),
  randomPKCECodeVerifier: vi.fn().mockReturnValue('test-verifier'),
  calculatePKCECodeChallenge: vi.fn().mockResolvedValue('test-challenge'),
  buildAuthorizationUrl: vi
    .fn()
    .mockReturnValue(new URL('https://idp.example.com/authorize?foo=bar')),
  authorizationCodeGrant: vi.fn().mockResolvedValue({
    claims: () => ({ sub: 'user-sub', email: 'u@example.com' }),
  }),
}));

vi.mock('@src/lib/config/env.js', () => ({
  getOidcIssuer: vi.fn().mockReturnValue('https://accounts.google.com'),
  getOidcClientId: vi.fn().mockReturnValue('client-id'),
  getOidcClientSecret: vi.fn().mockReturnValue('client-secret'),
  getOidcRedirectUri: vi.fn().mockReturnValue('http://localhost:3000/v1/auth/callback'),
  getSessionSecret: vi.fn().mockReturnValue('test-session-secret-for-hmac-key-must-be-long'),
}));

import {
  getOidcConfig,
  generateAuthParams,
  exchangeCode,
  resetOidcConfig,
} from '@src/lib/auth/oidc/oidcClient.js';
import * as oidcModule from 'openid-client';

describe('oidcClient', () => {
  const sessionSecret = 'test-session-secret-for-hmac-key-must-be-long';

  beforeEach(() => {
    resetOidcConfig();
    vi.clearAllMocks();
  });

  describe('getOidcConfig', () => {
    it('calls discovery and caches the result', async () => {
      await getOidcConfig();
      await getOidcConfig();
      expect(oidcModule.discovery).toHaveBeenCalledTimes(1);
    });

    it('throws when OIDC is not configured', async () => {
      const envMod = await import('@src/lib/config/env.js');
      vi.mocked(envMod.getOidcIssuer).mockReturnValueOnce(undefined as unknown as string);
      resetOidcConfig();
      await expect(getOidcConfig()).rejects.toThrow('OIDC not configured');
    });
  });

  describe('generateAuthParams', () => {
    it('returns redirectUrl with signed PKCE state', async () => {
      const result = await generateAuthParams();
      expect(result.redirectUrl).toBeInstanceOf(URL);
      expect(result).not.toHaveProperty('state');
    });

    it('calls buildAuthorizationUrl with correct parameters', async () => {
      await generateAuthParams();
      expect(oidcModule.buildAuthorizationUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          redirect_uri: 'http://localhost:3000/v1/auth/callback',
          scope: 'openid email profile',
          code_challenge: 'test-challenge',
          code_challenge_method: 'S256',
          state: expect.stringMatching(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
        })
      );
    });
  });

  describe('exchangeCode', () => {
    it('calls authorizationCodeGrant with verifier from state', async () => {
      const state = encodePkceState('test-verifier', sessionSecret);
      const callbackUrl = new URL(
        `http://localhost:3000/v1/auth/callback?code=abc&state=${encodeURIComponent(state)}`
      );
      await exchangeCode(callbackUrl);

      expect(oidcModule.authorizationCodeGrant).toHaveBeenCalledWith(
        expect.anything(),
        callbackUrl,
        {
          pkceCodeVerifier: 'test-verifier',
          expectedState: state,
        }
      );
    });
  });
});
