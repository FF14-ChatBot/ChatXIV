import type { AuthMeResponse } from '@chatxiv/cdm';

export interface AuthApiClient {
  /** Fetch the current user. Returns null when not authenticated (401). */
  fetchMe(): Promise<AuthMeResponse | null>;
  /** End the current session. */
  logout(): Promise<void>;
  /** Full-page URL the browser should navigate to in order to start OIDC login. */
  getLoginUrl(): string;
}
