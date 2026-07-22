import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ChatRoute, ChatStreamEventType, ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { createChatRouter } from '@src/routes/v1/chat.js';
import { createMockChatService } from '@test/mocks/chatService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { ChatService } from '@src/lib/chat/types.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { CHAT_MAX_USER_MESSAGE_CHARS } from '@src/lib/config/constants.js';

function buildApp(service: Mocked<ChatService>, opts?: { jsonStrict?: boolean }) {
  const app = express();
  app.use(express.json({ strict: opts?.jsonStrict ?? true }));
  app.use('/v1', createChatRouter(service));
  app.use(errorHandler());
  return app;
}

/**
 * After the first SSE `write`, sets `res.destroyed` so the handler stops streaming.
 * The real handler skips `res.end()` when destroyed, so we finish the HTTP response on `setImmediate`
 * for supertest (after the async handler has returned).
 */
function buildAppWithStreamDestroyAfterFirstWrite(service: Mocked<ChatService>) {
  const app = express();
  app.use(express.json());
  app.use('/v1', (req, res, next) => {
    if (req.method !== 'POST' || !req.originalUrl.includes(`${ChatRoute.StreamSegment}`)) {
      next();
      return;
    }
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    let writeCount = 0;
    res.write = ((chunk: unknown, ...rest: unknown[]) => {
      writeCount += 1;
      const out = Reflect.apply(origWrite, res, [chunk, ...rest] as Parameters<typeof origWrite>);
      if (writeCount === 1) {
        Object.defineProperty(res, 'destroyed', {
          value: true,
          configurable: true,
          writable: true,
        });
        setImmediate(() => {
          if (!res.writableEnded) {
            origEnd();
          }
        });
      }
      return out;
    }) as typeof res.write;
    next();
  });
  app.use('/v1', createChatRouter(service));
  app.use(errorHandler());
  return app;
}

describe('chat routes', () => {
  let chatService: Mocked<ChatService>;

  beforeEach(() => {
    chatService = createMockChatService();
  });

  describe(`POST /v1${ChatRoute.Segment}`, () => {
    it('returns 200 with chat response body on success', async () => {
      chatService.handleMessage.mockResolvedValue({
        messageId: 'msg-1',
        answer: 'Hello',
        sources: [{ sourceName: 'XIVAPI' }],
        category: UsageCategory.RAIDING,
      });

      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'What is savage?' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        messageId: 'msg-1',
        answer: 'Hello',
        sources: [{ sourceName: 'XIVAPI' }],
        category: UsageCategory.RAIDING,
      });
      expect(chatService.handleMessage).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'What is savage?' })
      );
    });

    it('returns 400 when body is missing', async () => {
      const res = await request(buildApp(chatService)).post(`/v1${ChatRoute.Segment}`).send();
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is a JSON non-object (e.g. number)', async () => {
      const res = await request(buildApp(chatService, { jsonStrict: false }))
        .post(`/v1${ChatRoute.Segment}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(42));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when message is missing', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ sessionId: 's1' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when message is empty', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: '   ' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when message exceeds max length', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'x'.repeat(CHAT_MAX_USER_MESSAGE_CHARS + 1) });
      expect(res.status).toBe(400);
    });

    it('returns 400 when sessionId is not a string', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'hi', sessionId: 123 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when language is not a string', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'hi', language: true });
      expect(res.status).toBe(400);
    });

    it('returns 400 when conversationHistory is not an array', async () => {
      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'hi', conversationHistory: {} });
      expect(res.status).toBe(400);
    });

    it('returns 503 SOURCE_UNAVAILABLE when handleMessage rejects', async () => {
      chatService.handleMessage.mockRejectedValue(AppError.sourceUnavailable('XIVAPI unavailable'));

      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.Segment}`)
        .send({ message: 'What is savage?' });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
    });
  });

  describe(`POST /v1${ChatRoute.StreamSegment}`, () => {
    it('streams SSE events with text/event-stream', async () => {
      async function* stream() {
        yield {
          type: ChatStreamEventType.Token,
          messageId: 'm-stream',
          content: 'a',
        };
        yield {
          type: ChatStreamEventType.Sources,
          messageId: 'm-stream',
          sources: [],
        };
        yield {
          type: ChatStreamEventType.Done,
          messageId: 'm-stream',
          sources: [],
          category: UsageCategory.MSQ,
        };
      }
      chatService.handleMessageStream.mockImplementation(stream);

      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.StreamSegment}`)
        .send({ message: 'story question' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(res.text).toContain('data:');
      expect(res.text).toContain('"type":"token"');
      expect(res.text).toContain('"type":"done"');
    });

    it('writes error SSE frame when handleMessageStream throws mid-stream', async () => {
      chatService.handleMessageStream.mockImplementation(async function* () {
        yield {
          type: ChatStreamEventType.Token,
          messageId: 'm-err',
          content: 'partial',
        };
        throw new Error('stream failed');
      });

      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.StreamSegment}`)
        .send({ message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('"type":"error"');
      expect(res.text).toContain('unexpected error occurred during streaming');
    });

    it('returns 503 JSON when handleMessageStream throws before any SSE event', async () => {
      chatService.handleMessageStream.mockImplementation(() => ({
        [Symbol.asyncIterator]() {
          return {
            next: async () => {
              throw AppError.sourceUnavailable('XIVAPI unavailable');
            },
          };
        },
      }));

      const res = await request(buildApp(chatService))
        .post(`/v1${ChatRoute.StreamSegment}`)
        .send({ message: 'hi' });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
    });

    it('stops streaming when the response is already destroyed', async () => {
      async function* stream() {
        yield {
          type: ChatStreamEventType.Token,
          messageId: 'm-cut',
          content: 'only',
        };
        yield {
          type: ChatStreamEventType.Done,
          messageId: 'm-cut',
          sources: [],
          category: UsageCategory.MSQ,
        };
      }
      chatService.handleMessageStream.mockImplementation(stream);

      const res = await request(buildAppWithStreamDestroyAfterFirstWrite(chatService))
        .post(`/v1${ChatRoute.StreamSegment}`)
        .send({ message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('"type":"token"');
      expect(res.text).not.toContain('"type":"done"');
    });

    it('does not write error SSE frame when stream throws but response is destroyed', async () => {
      chatService.handleMessageStream.mockImplementation(async function* () {
        yield {
          type: ChatStreamEventType.Token,
          messageId: 'm-x',
          content: 'a',
        };
        throw new Error('stream failed');
      });

      const res = await request(buildAppWithStreamDestroyAfterFirstWrite(chatService))
        .post(`/v1${ChatRoute.StreamSegment}`)
        .send({ message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('"type":"token"');
      expect(res.text).not.toContain('"type":"error"');
    });
  });
});
