import type { HttpClientConfig } from './types';

export function buildUrl(baseUrl: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalized}`;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

/** Returns raw Response; callers handle status and body (so each client can map errors its own way). */
export async function request(
  config: HttpClientConfig,
  method: string,
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {}
): Promise<Response> {
  const { body, signal } = options;
  const url = buildUrl(config.baseUrl, path);
  const headers = config.getHeaders?.(method, path, body) ?? DEFAULT_HEADERS;

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  };
  if (signal) (init as RequestInit & { signal?: AbortSignal }).signal = signal;

  return fetch(url, init);
}
