import type { ConversationTurn, SourceCitation } from '@chatxiv/cdm';
import type { RetrievedChunk } from '../knowledge/types.js';

/**
 * Model-agnostic LLM client interface. The concrete implementation
 * (Anthropic, OpenAI, etc.) owns the SDK, API key, streaming, timeouts,
 * and prompt construction. ChatService depends on this interface,
 * never on a specific SDK.
 */
export interface LlmClient {
  /**
   * Streaming: yields text tokens as they arrive from the LLM.
   * Callers must consume the iterable fully or break to cancel.
   * On LLM error, the iterable throws (caller catches and handles).
   */
  formatWithCitationsStream(request: LlmFormatRequest): AsyncIterable<string>;

  /** Convenience: accumulates the stream into a single result. */
  formatWithCitations(request: LlmFormatRequest): Promise<LlmFormatResult>;
}

export interface LlmFormatRequest {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly retrievedChunks: readonly RetrievedChunk[];
  readonly conversationHistory?: readonly ConversationTurn[];
  readonly language?: string;
}

export interface LlmFormatResult {
  readonly content: string;
  readonly sources: readonly SourceCitation[];
  readonly inputTokens: number;
  readonly outputTokens: number;
}
