import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatStreamEventType, ConversationRole, ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { createChatService } from '@src/lib/chat/chatService.js';
import { AppError } from '@src/lib/errors/AppError.js';
import type { ClassificationService } from '@src/lib/classification/types.js';
import type { KnowledgeService } from '@src/lib/knowledge/types.js';
import type { LlmClient } from '@src/lib/llm/types.js';
import type { ChatService } from '@src/lib/chat/types.js';

describe('createChatService', () => {
  let classification: ClassificationService;
  let knowledge: KnowledgeService;
  let llm: LlmClient;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    classification = {
      classify: vi.fn().mockResolvedValue({
        category: UsageCategory.RAIDING,
        confidence: 0.9,
      }),
    };
    knowledge = {
      retrieve: vi.fn().mockResolvedValue({
        chunks: [
          {
            text: 'ctx',
            source: { sourceName: 'Wiki' },
            score: 1,
          },
        ],
      }),
    };
    llm = {
      formatWithCitationsStream: vi.fn().mockImplementation(async function* () {
        yield 'Hi';
      }),
      formatWithCitations: vi.fn(),
    };
  });

  it('handleMessageStream yields tokens, sources, and done', async () => {
    const svc = createChatService(classification, knowledge, llm);
    const events: unknown[] = [];
    for await (const e of svc.handleMessageStream({ message: 'raid tip' })) {
      events.push(e);
    }
    expect(events.some((e) => (e as { type: string }).type === ChatStreamEventType.Token)).toBe(
      true
    );
    expect(events.some((e) => (e as { type: string }).type === ChatStreamEventType.Sources)).toBe(
      true
    );
    expect(events.some((e) => (e as { type: string }).type === ChatStreamEventType.Done)).toBe(
      true
    );
    expect(classification.classify).toHaveBeenCalledWith('raid tip', undefined);
    expect(knowledge.retrieve).toHaveBeenCalled();
    expect(llm.formatWithCitationsStream).toHaveBeenCalled();
  });

  it('passes the pipeline AbortSignal to the LLM client so a stalled call can actually be cancelled', async () => {
    const svc = createChatService(classification, knowledge, llm);
    const events: unknown[] = [];
    for await (const e of svc.handleMessageStream({ message: 'raid tip' })) {
      events.push(e);
    }
    const call = (llm.formatWithCitationsStream as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.signal).toBeInstanceOf(AbortSignal);
  });

  it('falls back when classification throws', async () => {
    classification.classify = vi.fn().mockRejectedValue(new Error('cls'));
    const svc = createChatService(classification, knowledge, llm);
    const events: unknown[] = [];
    for await (const e of svc.handleMessageStream({ message: 'q' })) {
      events.push(e);
    }
    expect(events.length).toBeGreaterThan(0);
    expect(knowledge.retrieve).toHaveBeenCalledWith(
      'q',
      expect.objectContaining({ category: UsageCategory.UNCATEGORIZED })
    );
  });

  it('continues with empty chunks when retrieve throws a non-source error', async () => {
    knowledge.retrieve = vi.fn().mockRejectedValue(new Error('net'));
    const svc = createChatService(classification, knowledge, llm);
    const events: unknown[] = [];
    for await (const e of svc.handleMessageStream({ message: 'q' })) {
      events.push(e);
    }
    expect(events.some((e) => (e as { type: string }).type === ChatStreamEventType.Done)).toBe(
      true
    );
  });

  it('propagates SOURCE_UNAVAILABLE when retrieve fails closed', async () => {
    knowledge.retrieve = vi
      .fn()
      .mockRejectedValue(AppError.sourceUnavailable('XIVAPI unavailable'));
    const svc = createChatService(classification, knowledge, llm);
    await expect(
      (async () => {
        for await (const event of svc.handleMessageStream({ message: 'q' })) {
          void event;
        }
      })()
    ).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('rejects handleMessage with SOURCE_UNAVAILABLE instead of a safe 200 body', async () => {
    knowledge.retrieve = vi
      .fn()
      .mockRejectedValue(AppError.sourceUnavailable('XIVAPI unavailable'));
    const svc = createChatService(classification, knowledge, llm);
    await expect(svc.handleMessage({ message: 'q' })).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('yields error event when LLM stream throws', async () => {
    llm.formatWithCitationsStream = vi.fn().mockImplementation(async function* () {
      yield '!';
      throw new Error('llm down');
    });
    const svc = createChatService(classification, knowledge, llm);
    const events: unknown[] = [];
    for await (const e of svc.handleMessageStream({ message: 'q' })) {
      events.push(e);
    }
    const err = events.find((e) => (e as { type: string }).type === ChatStreamEventType.Error);
    expect(err).toBeDefined();
  });

  it('handleMessage aggregates stream tokens into answer', async () => {
    const svc = createChatService(classification, knowledge, llm);
    const res = await svc.handleMessage({ message: 'hello' });
    expect(res.answer).toBe('Hi');
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it('skips token events with empty content when accumulating', async () => {
    llm.formatWithCitationsStream = vi.fn().mockImplementation(async function* () {
      yield '';
      yield 'x';
    });
    const svc = createChatService(classification, knowledge, llm);
    const res = await svc.handleMessage({ message: 'hello' });
    expect(res.answer).toBe('x');
  });

  it('passes a copy of conversationHistory to the LLM client', async () => {
    const history = [{ role: ConversationRole.User, content: 'prev' }];
    const svc = createChatService(classification, knowledge, llm);
    await svc.handleMessage({ message: 'hello', conversationHistory: history });
    const streamMock = vi.mocked(llm.formatWithCitationsStream);
    expect(streamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationHistory: [{ role: ConversationRole.User, content: 'prev' }],
      })
    );
    expect(streamMock.mock.calls[0][0].conversationHistory).not.toBe(history);
  });

  it('forwards classification entities to knowledge retrieve', async () => {
    classification.classify = vi.fn().mockResolvedValue({
      category: UsageCategory.RAIDING,
      confidence: 0.9,
      entities: { jobName: 'PLD' },
    });
    const svc = createChatService(classification, knowledge, llm);
    const iter = svc.handleMessageStream({ message: 'tank tips' })[Symbol.asyncIterator]();
    await iter.next();
    expect(knowledge.retrieve).toHaveBeenCalledWith(
      'tank tips',
      expect.objectContaining({ entities: { jobName: 'PLD' } })
    );
  });

  it('handleMessage merges Sources and Done metadata when accumulating', async () => {
    const base = createChatService(classification, knowledge, llm);
    const svc = base as ChatService & {
      handleMessageStream: ChatService['handleMessageStream'];
    };
    svc.handleMessageStream = async function* () {
      yield { type: ChatStreamEventType.Token, messageId: 'acc', content: 'body' };
      yield {
        type: ChatStreamEventType.Sources,
        messageId: 'acc',
        sources: [{ sourceName: 'FromSources' }],
      };
      yield {
        type: ChatStreamEventType.Done,
        messageId: 'acc',
        category: UsageCategory.MSQ,
      };
    };
    const res = await svc.handleMessage({ message: 'q' });
    expect(res.answer).toBe('body');
    expect(res.sources).toEqual([{ sourceName: 'FromSources' }]);
    expect(res.category).toBe(UsageCategory.MSQ);
  });

  it('treats missing Sources.sources as empty when accumulating', async () => {
    const base = createChatService(classification, knowledge, llm);
    const svc = base as ChatService & {
      handleMessageStream: ChatService['handleMessageStream'];
    };
    svc.handleMessageStream = async function* () {
      yield { type: ChatStreamEventType.Token, messageId: 'acc3', content: 't' };
      yield { type: ChatStreamEventType.Sources, messageId: 'acc3' };
      yield {
        type: ChatStreamEventType.Done,
        messageId: 'acc3',
        sources: [{ sourceName: 'Final' }],
        category: UsageCategory.BIS,
      };
    };
    const res = await svc.handleMessage({ message: 'q' });
    expect(res.sources).toEqual([{ sourceName: 'Final' }]);
  });

  it('handleMessage returns safe answer when stream yields error without message', async () => {
    const base = createChatService(classification, knowledge, llm);
    const svc = base as ChatService & {
      handleMessageStream: ChatService['handleMessageStream'];
    };
    svc.handleMessageStream = async function* errorStream() {
      yield {
        type: ChatStreamEventType.Error,
        messageId: 'm',
      };
    };
    const res = await svc.handleMessage({ message: 'x' });
    expect(res.answer).toBe(
      'Something went wrong while processing your request. Please try again.'
    );
    expect(res.sources).toEqual([]);
  });

  it('yields timeout after classify when pipeline budget elapses first', async () => {
    vi.useFakeTimers();
    classification.classify = vi.fn(
      () =>
        new Promise<{ category: UsageCategory; confidence: number }>((resolve) => {
          setTimeout(() => resolve({ category: UsageCategory.RAIDING, confidence: 1 }), 200_000);
        })
    );
    const svc = createChatService(classification, knowledge, llm);
    const iter = svc.handleMessageStream({ message: 'slow' })[Symbol.asyncIterator]();
    const first = iter.next();
    await vi.advanceTimersByTimeAsync(30_001);
    await vi.advanceTimersByTimeAsync(200_000);
    const result = await first;
    expect(result.done).toBe(false);
    expect((result.value as { type: string }).type).toBe(ChatStreamEventType.Error);
    expect((result.value as { error?: string }).error).toMatch(/timed out/i);
    expect((await iter.next()).done).toBe(true);
  });

  it('yields timeout after retrieve when pipeline budget elapses during retrieval', async () => {
    vi.useFakeTimers();
    let finishRetrieve: (v: { chunks: { text: string; source: { sourceName: string } }[] }) => void;
    const pendingRetrieve = new Promise<{
      chunks: { text: string; source: { sourceName: string } }[];
    }>((resolve) => {
      finishRetrieve = resolve;
    });
    knowledge.retrieve = vi.fn().mockReturnValue(pendingRetrieve);
    const svc = createChatService(classification, knowledge, llm);
    const iter = svc.handleMessageStream({ message: 'q' })[Symbol.asyncIterator]();
    const first = iter.next();
    await vi.advanceTimersByTimeAsync(30_001);
    finishRetrieve!({
      chunks: [{ text: 'c', source: { sourceName: 's' } }],
    });
    const result = await first;
    expect(result.done).toBe(false);
    expect((result.value as { type: string }).type).toBe(ChatStreamEventType.Error);
    expect((result.value as { error?: string }).error).toMatch(/timed out/i);
    expect((await iter.next()).done).toBe(true);
  });

  it('yields timeout mid-token when pipeline budget elapses before next token', async () => {
    vi.useFakeTimers();
    llm.formatWithCitationsStream = vi.fn().mockImplementation(async function* () {
      yield 'a';
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 40_000);
      });
      yield 'b';
    });
    const svc = createChatService(classification, knowledge, llm);
    const iter = svc.handleMessageStream({ message: 'q' })[Symbol.asyncIterator]();
    const t1 = await iter.next();
    expect((t1.value as { content?: string }).content).toBe('a');
    const t2Promise = iter.next();
    await vi.advanceTimersByTimeAsync(45_000);
    const t2 = await t2Promise;
    expect((t2.value as { type: string }).type).toBe(ChatStreamEventType.Error);
    expect((t2.value as { error?: string }).error).toMatch(/timed out/i);
    expect((await iter.next()).done).toBe(true);
  });

  it('yields timeout when the LLM stream ends silently on abort (no further token, no throw)', async () => {
    // Mirrors the real Anthropic SDK: once the request's own `signal` aborts, its stream just
    // ends -- no further token, no throw -- rather than continuing to yield (which is what let
    // the in-loop `controller.signal.aborted` check catch it before this regression was fixed).
    vi.useFakeTimers();
    llm.formatWithCitationsStream = vi.fn().mockImplementation(async function* (request: {
      signal?: AbortSignal;
    }) {
      yield 'a';
      await new Promise<void>((resolve) => {
        request.signal?.addEventListener('abort', () => resolve());
      });
    });
    const svc = createChatService(classification, knowledge, llm);
    const iter = svc.handleMessageStream({ message: 'q' })[Symbol.asyncIterator]();
    const t1 = await iter.next();
    expect((t1.value as { content?: string }).content).toBe('a');
    const t2Promise = iter.next();
    await vi.advanceTimersByTimeAsync(30_001);
    const t2 = await t2Promise;
    expect((t2.value as { type: string }).type).toBe(ChatStreamEventType.Error);
    expect((t2.value as { error?: string }).error).toMatch(/timed out/i);
    expect((await iter.next()).done).toBe(true);
  });
});
