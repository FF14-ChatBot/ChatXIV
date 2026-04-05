import type { ChatRequestBody, ChatResponseBody, ChatStreamEvent } from '@chatxiv/cdm';

/**
 * Top-level pipeline orchestrator: classify -> retrieve -> generate.
 * Route handlers depend on this interface only.
 */
export interface ChatService {
  /** Full response: internally consumes the stream and
   * accumulates the result all at once.
   */
  handleMessage(request: ChatRequestBody): Promise<ChatResponseBody>;

  /**
   * Streaming: yields SSE-shaped events as the LLM generates tokens.
   * The iterable completes with a 'done' event on success.
   * On error at any pipeline stage, yields an 'error' event and returns.
   */
  handleMessageStream(request: ChatRequestBody): AsyncIterable<ChatStreamEvent>;
}
