import type { ChatRequestBody, ChatResponseBody } from '@chatxiv/cdm';
import { CHAT_PATH, HTTP_METHOD } from '@chatxiv/cdm';
import { chatxivApiRequest } from './instance';
import type { ChatxivApiRequestOptions } from './types';

/** POST /v1/chat — single JSON response (see chat.ts on the backend for the SSE variant). */
export async function sendChatMessage(
  body: ChatRequestBody,
  options?: Omit<ChatxivApiRequestOptions, 'body'>
): Promise<ChatResponseBody> {
  return chatxivApiRequest<ChatResponseBody>(HTTP_METHOD.POST, CHAT_PATH, { ...options, body });
}
