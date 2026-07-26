import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import type { Stream } from '@anthropic-ai/sdk/core/streaming';
import type pino from 'pino';
import { ConversationRole } from '@chatxiv/cdm';
import {
  ANTHROPIC_DEFAULT_MAX_TOKENS,
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_DEFAULT_TIMEOUT_MS,
} from '../config/constants.js';
import type { LlmClient, LlmFormatRequest, LlmFormatResult } from './types.js';

export type AnthropicClientConfig = Readonly<{
  /** Undefined means chat is unconfigured; every call throws until an operator sets the key. */
  apiKey: string | undefined;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}>;

/** Anthropic Messages API implementation of {@link LlmClient} (format + cite step only; see TR-4). */
export function createAnthropicClient(config: AnthropicClientConfig, log: pino.Logger): LlmClient {
  const model = config.model ?? ANTHROPIC_DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? ANTHROPIC_DEFAULT_MAX_TOKENS;
  const timeoutMs = config.timeoutMs ?? ANTHROPIC_DEFAULT_TIMEOUT_MS;
  const sdkClient = config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : undefined;

  function requireClient(): Anthropic {
    if (!sdkClient) {
      throw new Error('Anthropic client is not configured: ANTHROPIC_API_KEY is unset.');
    }
    return sdkClient;
  }

  async function createRawStream(
    request: LlmFormatRequest
  ): Promise<Stream<RawMessageStreamEvent>> {
    return requireClient().messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: buildSystemPrompt(request),
        messages: buildMessages(request),
        stream: true,
      },
      { timeout: timeoutMs, maxRetries: 2 }
    );
  }

  return {
    async *formatWithCitationsStream(request: LlmFormatRequest): AsyncIterable<string> {
      try {
        const stream = await createRawStream(request);
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
          }
        }
      } catch (err) {
        log.error({ err }, 'Anthropic streaming request failed');
        throw new Error('The AI service encountered an error.');
      }
    },

    async formatWithCitations(request: LlmFormatRequest): Promise<LlmFormatResult> {
      let content = '';
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const stream = await createRawStream(request);
        for await (const event of stream) {
          if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens;
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            content += event.delta.text;
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens;
          }
        }
      } catch (err) {
        log.error({ err }, 'Anthropic request failed');
        throw new Error('The AI service encountered an error.');
      }

      return {
        content,
        sources: request.retrievedChunks.map((chunk) => chunk.source),
        inputTokens,
        outputTokens,
      };
    },
  };
}

function buildSystemPrompt(request: LlmFormatRequest): string {
  return request.language
    ? `${request.systemPrompt} Respond in ${request.language}.`
    : request.systemPrompt;
}

function buildMessages(request: LlmFormatRequest): MessageParam[] {
  const history: MessageParam[] = (request.conversationHistory ?? []).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  return [...history, { role: ConversationRole.User, content: buildUserContent(request) }];
}

function buildUserContent(request: LlmFormatRequest): string {
  if (request.retrievedChunks.length === 0) {
    return request.userMessage;
  }

  const context = request.retrievedChunks
    .map((chunk, i) => {
      const source = chunk.source.sourceUrl
        ? `${chunk.source.sourceName} (${chunk.source.sourceUrl})`
        : chunk.source.sourceName;
      return `[${i + 1}] ${source}\n${chunk.text}`;
    })
    .join('\n\n');

  return `Context:\n${context}\n\nQuestion: ${request.userMessage}`;
}
