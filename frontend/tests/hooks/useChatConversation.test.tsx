import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatConversation } from '@/hooks/useChatConversation';
import { CHAT_THREAD_GREETING } from '@/features/chat/chatThreadGreeting';
import type { ChatAssistantPort } from '@/lib/chat/chatAssistantPort';
import { DEMO_ASSISTANT_REPLY } from '@/lib/chat/chatAssistantPort';
import type { ChatSessionLanding } from '@/types/chatSession';
import { logger } from '@/lib/logger/instance';

describe('useChatConversation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds user message then assistant reply after demo delay', async () => {
    const { result } = renderHook(() => useChatConversation(0));

    act(() => {
      result.current.sendMessage('hi');
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe('user');

    await waitFor(
      () => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[1]?.text).toBe(DEMO_ASSISTANT_REPLY);
      },
      { timeout: 3000 }
    );
  });

  it('resets state when sessionGeneration changes', async () => {
    const { result, rerender } = renderHook(({ gen }) => useChatConversation(gen), {
      initialProps: { gen: 0 },
    });

    act(() => {
      result.current.sendMessage('one');
    });
    expect(result.current.messages).toHaveLength(1);

    rerender({ gen: 1 });
    expect(result.current.messages).toHaveLength(0);

    await waitFor(() => expect(result.current.messages).toHaveLength(0), { timeout: 100 });
    await new Promise((r) => setTimeout(r, 1100));
    expect(result.current.messages).toHaveLength(0);
  });

  it('seeds a thread greeting when generation changes with sessionLanding thread', () => {
    const { result, rerender } = renderHook(
      ({ gen, landing }: { gen: number; landing: ChatSessionLanding }) =>
        useChatConversation(gen, { sessionLanding: landing }),
      { initialProps: { gen: 0, landing: 'welcome' as const } }
    );

    rerender({ gen: 1, landing: 'thread' });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe('assistant');
    expect(result.current.messages[0]?.text).toBe(CHAT_THREAD_GREETING);

    rerender({ gen: 2, landing: 'welcome' });
    expect(result.current.messages).toHaveLength(0);
  });

  it('uses injected assistant port', async () => {
    const assistantPort: ChatAssistantPort = {
      getReply: async () => ({ text: 'from mock' }),
    };
    const { result } = renderHook(() => useChatConversation(0, { assistantPort }));

    act(() => {
      result.current.sendMessage('q');
    });
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]?.text).toBe('from mock');
    });
  });

  it('does not log when assistant reply throws AbortError', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const assistantPort: ChatAssistantPort = {
      getReply: async () => {
        throw new DOMException('Aborted', 'AbortError');
      },
    };
    const { result } = renderHook(() => useChatConversation(0, { assistantPort }));

    act(() => {
      result.current.sendMessage('q');
    });

    await waitFor(() => {
      expect(errorSpy).not.toHaveBeenCalled();
    });
    expect(result.current.messages).toHaveLength(1);
  });

  it('logs when assistant reply fails with a non-abort error', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const assistantPort: ChatAssistantPort = {
      getReply: async () => {
        throw new Error('assistant down');
      },
    };
    const { result } = renderHook(() => useChatConversation(0, { assistantPort }));

    act(() => {
      result.current.sendMessage('q');
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Chat assistant reply failed',
        expect.objectContaining({ error: 'assistant down' })
      );
    });
    expect(result.current.messages).toHaveLength(1);
  });
});
