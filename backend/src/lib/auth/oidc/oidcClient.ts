import * as oidcClient from 'openid-client';
import type { Configuration } from 'openid-client';
import {
  getOidcIssuer,
  getOidcClientId,
  getOidcClientSecret,
  getOidcRedirectUri,
  getSessionSecret,
} from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { encodePkceState, decodePkceState } from './pkceState.js';

let cachedConfig: Configuration | null = null;

export async function getOidcConfig(): Promise<Configuration> {
  if (cachedConfig) return cachedConfig;

  const issuer = getOidcIssuer();
  const clientId = getOidcClientId();
  const clientSecret = getOidcClientSecret();

  const redirectUri = getOidcRedirectUri();

  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    throw AppError.internal(
      'OIDC not configured: set OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, and OIDC_REDIRECT_URI'
    );
  }

  cachedConfig = await oidcClient.discovery(new URL(issuer), clientId, clientSecret);
  return cachedConfig;
}

export async function generateAuthParams(): Promise<{ redirectUrl: URL }> {
  const secret = getSessionSecret();
  if (!secret) {
    throw AppError.internal('SESSION_SECRET not configured');
  }

  const config = await getOidcConfig();

  const codeVerifier = oidcClient.randomPKCECodeVerifier();
  const codeChallenge = await oidcClient.calculatePKCECodeChallenge(codeVerifier);
  const state = encodePkceState(codeVerifier, secret);

  const redirectUrl = oidcClient.buildAuthorizationUrl(config, {
    redirect_uri: getOidcRedirectUri()!,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return { redirectUrl };
}

export async function exchangeCode(callbackUrl: URL) {
  const secret = getSessionSecret();
  if (!secret) {
    throw AppError.internal('SESSION_SECRET not configured');
  }

  const stateParam = callbackUrl.searchParams.get('state');
  if (!stateParam) {
    throw AppError.validation('Missing OAuth state parameter');
  }

  const codeVerifier = decodePkceState(stateParam, secret);
  const config = await getOidcConfig();

  return oidcClient.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: stateParam,
  });
}

/** Reset the cached Configuration (for tests). */
export function resetOidcConfig(): void {
  cachedConfig = null;
}
