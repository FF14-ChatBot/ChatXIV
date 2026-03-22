import type { ApiErrorResponse } from '@chatxiv/cdm';
import { ERROR_CODES } from '@chatxiv/cdm';
import { request as coreRequest } from '../core/request';
import { getChatxivApiBaseUrl } from './config';
import { ApiClientError } from './errors/ApiClientError';
import type { ChatxivApiConfig, ChatxivApiRequestOptions, ChatxivApiClient } from './types';

function randomRequestId(): string {
  return crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildChatxivApiHeaders(
  _method: string,
  _path: string,
  _body: unknown,
  apiConfig: ChatxivApiConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': randomRequestId(),
  };
  const sessionId = apiConfig.getSessionId?.();
  if (sessionId) headers['X-Session-Id'] = sessionId;
  return headers;
}

export async function parseErrorBody(response: Response): Promise<ApiErrorResponse | undefined> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  const parsed = await response
    .json()
    .then((data: unknown) => data as ApiErrorResponse)
    .catch(() => undefined);
  return parsed;
}

async function runRequest<T = unknown>(
  method: string,
  path: string,
  options: ChatxivApiRequestOptions = {}
): Promise<T> {
  const { body, config = {}, signal } = options;
  const baseUrl = config.baseUrl ?? getChatxivApiBaseUrl();

  const httpConfig = {
    baseUrl,
    getHeaders: (m: string, p: string, b: unknown) => buildChatxivApiHeaders(m, p, b, config),
  };

  let response: Response;
  try {
    response = await coreRequest(httpConfig, method, path, { body, signal });
  } catch {
    throw ApiClientError.fromCode(ERROR_CODES.INTERNAL_ERROR);
  }

  if (!response.ok) {
    const bodyParsed = await parseErrorBody(response);
    const code = bodyParsed?.code ?? ERROR_CODES.INTERNAL_ERROR;
    throw ApiClientError.fromCode(code, {
      requestId: bodyParsed?.requestId,
      status: response.status,
      body: bodyParsed,
    });
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  if (response.status === 204 || (response.status === 200 && !isJson)) {
    return undefined as T;
  }
  if (!isJson) return undefined as T;
  return response.json() as Promise<T>;
}

/** Default ChatXIV API client implementation. Inject at app boot via setChatxivApiClient(). */
export function createChatxivApiClient(): ChatxivApiClient {
  return {
    request<T = unknown>(
      method: string,
      path: string,
      options?: ChatxivApiRequestOptions
    ): Promise<T> {
      return runRequest<T>(method, path, options);
    },
  };
}
