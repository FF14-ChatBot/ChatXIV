import type { ChatxivApiClient, ChatxivApiRequestOptions } from './types.js';

let instance: ChatxivApiClient | null = null;

/** Set the API client (call once at app boot). Required before first use of chatxivApiRequest/getChatxivApiClient. */
export function setChatxivApiClient(impl: ChatxivApiClient): void {
  instance = impl;
}

/** Get the current client. Throws if setChatxivApiClient() has not been called. */
export function getChatxivApiClient(): ChatxivApiClient {
  if (instance === null) {
    throw new Error(
      'ChatXIV API client not initialized. Call setChatxivApiClient() at app boot (e.g. in main.tsx).'
    );
  }
  return instance;
}

/** Convenience: delegates to the injected client. Use this in app code. */
export async function chatxivApiRequest<T = unknown>(
  method: string,
  path: string,
  options?: ChatxivApiRequestOptions
): Promise<T> {
  return getChatxivApiClient().request<T>(method, path, options);
}
