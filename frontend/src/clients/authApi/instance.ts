import type { AuthApiClient } from './types';

let instance: AuthApiClient | null = null;

/** Set the auth API client (call once at app boot). */
export function setAuthApiClient(impl: AuthApiClient): void {
  instance = impl;
}

/** Get the current auth API client. Throws if not initialized. */
export function getAuthApiClient(): AuthApiClient {
  if (instance === null) {
    throw new Error(
      'Auth API client not initialized. Call setAuthApiClient() at app boot (e.g. in main.tsx).'
    );
  }
  return instance;
}
