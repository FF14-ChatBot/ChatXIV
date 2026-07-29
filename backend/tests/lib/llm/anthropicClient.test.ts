import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationRole } from '@chatxiv/cdm';
import type pino from 'pino';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function AnthropicMockCtor() {
    return { messages: { create: mockCreate } };
  }),
}));

import Anthropic from '@anthropic-ai/sdk';
import { createAnthropicClient } from '@src/lib/llm/anthropicClient.js';
import type { LlmFormatRequest } from '@src/lib/llm/types.js';

const AnthropicMock = vi.mocked(Anthropic);

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

function fakeStream(events: unknown[]): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: async () => {
          if (i < events.length) {
            return { value: events[i++], done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };
}

const messageStart = (inputTokens: number) => ({
  type: 'message_start',
  message: { usage: { input_tokens: inputTokens } },
});
const textDelta = (text: string) => ({
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text },
});
const messageDelta = (outputTokens: number) => ({
  type: 'message_delta',
  delta: {},
  usage: { output_tokens: outputTokens },
});
const messageStop = { type: 'message_stop' };

const baseRequest: LlmFormatRequest = {
  systemPrompt: 'You are ChatXIV.',
  userMessage: 'How do I unlock the Gold Saucer?',
  retrievedChunks: [],
};

describe('createAnthropicClient', () => {
  let log: pino.Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    log = createMockLogger();
    mockCreate.mockResolvedValue(
      fakeStream([
        messageStart(10),
        textDelta('Hello '),
        textDelta('world'),
        messageDelta(2),
        messageStop,
      ])
    );
  });

  describe('when unconfigured (no API key)', () => {
    it('formatWithCitationsStream throws before calling the SDK', async () => {
      const client = createAnthropicClient({ apiKey: undefined }, log);
      const iterate = async () => {
        const tokens: string[] = [];
        for await (const token of client.formatWithCitationsStream(baseRequest)) {
          tokens.push(token);
        }
      };
      await expect(iterate()).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('formatWithCitations throws before calling the SDK', async () => {
      const client = createAnthropicClient({ apiKey: undefined }, log);
      await expect(client.formatWithCitations(baseRequest)).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('when configured', () => {
    it('constructs the SDK client with the given API key', () => {
      createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      expect(AnthropicMock).toHaveBeenCalledWith({ apiKey: 'sk-ant-test' });
    });

    it('formatWithCitationsStream yields text tokens in order', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      const tokens: string[] = [];
      for await (const token of client.formatWithCitationsStream(baseRequest)) {
        tokens.push(token);
      }
      expect(tokens).toEqual(['Hello ', 'world']);
    });

    it('formatWithCitations accumulates content, usage, and sources', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      const request: LlmFormatRequest = {
        ...baseRequest,
        retrievedChunks: [
          { text: 'ctx', source: { sourceName: 'Wiki', sourceUrl: 'https://wiki' } },
        ],
      };

      const result = await client.formatWithCitations(request);

      expect(result).toEqual({
        content: 'Hello world',
        sources: [{ sourceName: 'Wiki', sourceUrl: 'https://wiki' }],
        inputTokens: 10,
        outputTokens: 2,
      });
    });

    it('passes model, max_tokens, and timeout/retry options to the SDK', async () => {
      const client = createAnthropicClient(
        {
          apiKey: 'sk-ant-test',
          model: 'claude-haiku-4-5-20251001',
          maxTokens: 512,
          timeoutMs: 9_000,
        },
        log
      );
      await client.formatWithCitations(baseRequest);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          stream: true,
        }),
        { timeout: 9_000, maxRetries: 2 }
      );
    });

    it('passes the request signal through so the pipeline can actually cancel the call', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      const controller = new AbortController();

      await client.formatWithCitations({ ...baseRequest, signal: controller.signal });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it('omits the Context block when there are no retrieved chunks', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      await client.formatWithCitations(baseRequest);

      const [params] = mockCreate.mock.calls[0];
      expect(params.messages).toEqual([
        { role: ConversationRole.User, content: baseRequest.userMessage },
      ]);
    });

    it('formats retrieved chunks as numbered, sourced context', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      const request: LlmFormatRequest = {
        ...baseRequest,
        retrievedChunks: [
          {
            text: 'Talk to the attendant.',
            source: { sourceName: 'CGW', sourceUrl: 'https://cgw' },
          },
          { text: 'Complete the quest.', source: { sourceName: 'Fandom' } },
        ],
      };
      await client.formatWithCitations(request);

      const [params] = mockCreate.mock.calls[0];
      const content = params.messages[params.messages.length - 1].content as string;
      expect(content).toContain('[1] CGW (https://cgw)\nTalk to the attendant.');
      expect(content).toContain('[2] Fandom\nComplete the quest.');
      expect(content).toContain(`Question: ${request.userMessage}`);
    });

    it('prepends conversation history before the current turn', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      const request: LlmFormatRequest = {
        ...baseRequest,
        conversationHistory: [
          { role: ConversationRole.User, content: 'earlier question' },
          { role: ConversationRole.Assistant, content: 'earlier answer' },
        ],
      };
      await client.formatWithCitations(request);

      const [params] = mockCreate.mock.calls[0];
      expect(params.messages).toEqual([
        { role: ConversationRole.User, content: 'earlier question' },
        { role: ConversationRole.Assistant, content: 'earlier answer' },
        { role: ConversationRole.User, content: request.userMessage },
      ]);
    });

    it('appends a language instruction to the system prompt when language is set', async () => {
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);
      await client.formatWithCitations({ ...baseRequest, language: 'ja' });

      const [params] = mockCreate.mock.calls[0];
      expect(params.system).toBe(`${baseRequest.systemPrompt} Respond in ja.`);
    });

    it('formatWithCitationsStream logs and throws a safe error when the SDK call fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('upstream 401: invalid x-api-key sk-ant-secret'));
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);

      const iterate = async () => {
        const tokens: string[] = [];
        for await (const token of client.formatWithCitationsStream(baseRequest)) {
          tokens.push(token);
        }
      };

      await expect(iterate()).rejects.toThrow('The AI service encountered an error.');
      expect(log.error).toHaveBeenCalled();
    });

    it('formatWithCitations logs and throws a safe error when the SDK call fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('network error'));
      const client = createAnthropicClient({ apiKey: 'sk-ant-test' }, log);

      await expect(client.formatWithCitations(baseRequest)).rejects.toThrow(
        'The AI service encountered an error.'
      );
      expect(log.error).toHaveBeenCalled();
    });
  });
});
