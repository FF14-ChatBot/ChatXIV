import type { ChatResponseBody } from '@chatxiv/cdm';

/**
 * Placeholder `sendChatMessage` resolution for tests that only need the chat pipeline to complete
 * without crashing and don't assert on the reply content. Pair with:
 * ```ts
 * vi.mock('@/clients/chatxivApi/chat', () => ({
 *   sendChatMessage: vi.fn().mockResolvedValue(DEFAULT_CHAT_RESPONSE),
 * }));
 * ```
 * Tests that assert on the reply (text, sources, etc.) should keep their own literal instead.
 */
export const DEFAULT_CHAT_RESPONSE: ChatResponseBody = {
  messageId: 'm',
  answer: 'a',
  sources: [],
};
