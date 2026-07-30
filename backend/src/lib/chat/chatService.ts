import { randomUUID } from 'node:crypto';
import {
  ChatStreamEventType,
  ERROR_CODES,
  UsageCategory,
  type ChatRequestBody,
  type ChatResponseBody,
  type ChatStreamEvent,
  type SourceCitation,
} from '@chatxiv/cdm';
import { logger } from '../observability/logger.js';
import { AppError } from '../errors/AppError.js';
import type { ClassificationService } from '../classification/types.js';
import type { KnowledgeService } from '../knowledge/types.js';
import type { LlmClient } from '../llm/types.js';
import type { ChatService } from './types.js';

const SYSTEM_PROMPT =
  'You are ChatXIV, an FFXIV assistant. Answer ONLY from the provided context chunks. ' +
  'Cite sources by name. If no relevant context is provided, say ' +
  '"I couldn\'t find a sourced answer for that." Never invent facts.';

const PIPELINE_TIMEOUT_MS = 30_000;

/**
 * Orchestrates the chat pipeline: classify -> retrieve -> generate.
 *
 * Error strategy:
 * - Classification failure: fall back to UNCATEGORIZED (query all resolvers).
 * - Retrieval failure: pass empty chunks to LLM unless all sources failed (503).
 * - LLM failure: return/yield an error event with a safe user-facing message.
 * - Pipeline timeout: abort and return an error.
 */
export function createChatService(
  classificationService: ClassificationService,
  knowledgeService: KnowledgeService,
  llmClient: LlmClient
): ChatService {
  return {
    /** Accumulates the stream into a single result all at once. */
    async handleMessage(request: ChatRequestBody): Promise<ChatResponseBody> {
      const messageId = randomUUID();
      const collected: string[] = [];
      let sources: readonly SourceCitation[] = [];
      let category: UsageCategory | undefined;

      try {
        for await (const event of this.handleMessageStream(request)) {
          switch (event.type) {
            case ChatStreamEventType.Token:
              if (event.content) collected.push(event.content);
              break;
            case ChatStreamEventType.Sources:
              sources = event.sources ?? [];
              break;
            case ChatStreamEventType.Done:
              category = event.category;
              sources = event.sources ?? sources;
              break;
            case ChatStreamEventType.Error:
              throw new Error(event.error ?? 'Pipeline error');
          }
        }
      } catch (err) {
        if (err instanceof AppError && err.code === ERROR_CODES.SOURCE_UNAVAILABLE) {
          throw err;
        }
        logger.error({ err, messageId }, 'Chat pipeline failed during accumulation');
        return {
          messageId,
          answer: 'Something went wrong while processing your request. Please try again.',
          sources: [],
        };
      }

      return {
        messageId,
        answer: collected.join(''),
        sources,
        category,
      };
    },

    /** Streaming: yields SSE-shaped events as the LLM generates tokens for a smoother user experience. */
    async *handleMessageStream(request: ChatRequestBody): AsyncIterable<ChatStreamEvent> {
      const messageId = randomUUID();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PIPELINE_TIMEOUT_MS);

      try {
        // ── Step 1: Classify ──────────────────────────────────────────
        let category: UsageCategory = UsageCategory.UNCATEGORIZED;
        let entities;

        try {
          const classification = await classificationService.classify(
            request.message,
            request.language
          );
          category = classification.category;
          entities = classification.entities;
          logger.info(
            { messageId, category, confidence: classification.confidence },
            'Query classified'
          );
        } catch (err) {
          logger.warn(
            { err, messageId, fallbackCategory: UsageCategory.UNCATEGORIZED },
            `Classification failed; falling back to ${UsageCategory.UNCATEGORIZED}`
          );
        }

        if (controller.signal.aborted) {
          yield timeoutEvent(messageId);
          return;
        }

        // ── Step 2: Retrieve ──────────────────────────────────────────
        let chunks;
        try {
          const result = await knowledgeService.retrieve(request.message, {
            category,
            language: request.language,
            entities,
          });
          chunks = result.chunks;
          logger.info({ messageId, chunkCount: chunks.length, category }, 'Retrieval complete');
        } catch (err) {
          if (err instanceof AppError && err.code === ERROR_CODES.SOURCE_UNAVAILABLE) {
            throw err;
          }
          logger.warn({ err, messageId }, 'Retrieval failed; proceeding with empty context');
          chunks = [];
        }

        if (controller.signal.aborted) {
          yield timeoutEvent(messageId);
          return;
        }

        // ── Step 3: Generate (stream) ─────────────────────────────────
        const sources: SourceCitation[] = chunks.map((c) => c.source);

        try {
          const stream = llmClient.formatWithCitationsStream({
            systemPrompt: SYSTEM_PROMPT,
            userMessage: request.message,
            retrievedChunks: chunks,
            conversationHistory: request.conversationHistory
              ? [...request.conversationHistory]
              : undefined,
            language: request.language,
            signal: controller.signal,
          });

          for await (const token of stream) {
            if (controller.signal.aborted) {
              yield timeoutEvent(messageId);
              return;
            }
            // One yield → one `ChatStreamEvent`; the route maps each to an SSE `data:` line while
            // the same HTTP response stays open until the generator finishes (then `sources` / `done`).
            yield {
              type: ChatStreamEventType.Token,
              messageId,
              content: token,
            };
          }

          // The LLM client's stream ends silently (no throw) when `signal` fires mid-stream --
          // the loop above exits with no further token to trigger the in-loop abort check, and
          // would otherwise fall through to a normal Done as if a truncated answer were complete.
          if (controller.signal.aborted) {
            yield timeoutEvent(messageId);
            return;
          }
        } catch (err) {
          logger.error({ err, messageId }, 'LLM streaming failed');
          yield {
            type: ChatStreamEventType.Error,
            messageId,
            error: 'The AI service encountered an error. Please try again.',
          };
          return;
        }

        // ── Step 4: Done ──────────────────────────────────────────────
        yield {
          type: ChatStreamEventType.Sources,
          messageId,
          sources,
        };

        yield {
          type: ChatStreamEventType.Done,
          messageId,
          sources,
          category,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function timeoutEvent(messageId: string): ChatStreamEvent {
  return {
    type: ChatStreamEventType.Error,
    messageId,
    error: 'Request timed out. Please try a shorter or simpler question.',
  };
}
