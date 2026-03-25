import type { AuthMeResponse } from '@chatxiv/cdm';
import { AUTH_BASE_PATH } from '@chatxiv/cdm';
import { request as coreRequest } from '../core/request';
import { getAuthApiBaseUrl } from './config';
import type { AuthApiClient } from './types';

export function createAuthApiClient(): AuthApiClient {
  const baseUrl = getAuthApiBaseUrl();

  const httpConfig = { baseUrl };

  return {
    async fetchMe(): Promise<AuthMeResponse | null> {
      let response: Response;
      try {
        response = await coreRequest(httpConfig, 'GET', `${AUTH_BASE_PATH}/me`);
      } catch {
        throw new Error('Network error while fetching auth status');
      }

      if (response.status === 401) return null;

      if (!response.ok) {
        throw new Error(`Auth check failed with status ${String(response.status)}`);
      }

      return response.json() as Promise<AuthMeResponse>;
    },

    async logout(): Promise<void> {
      let response: Response;
      try {
        response = await coreRequest(httpConfig, 'POST', `${AUTH_BASE_PATH}/logout`);
      } catch {
        throw new Error('Network error during logout');
      }

      if (!response.ok) {
        throw new Error(`Logout failed with status ${String(response.status)}`);
      }
    },

    getLoginUrl(): string {
      return `${baseUrl}${AUTH_BASE_PATH}/login`;
    },
  };
}
