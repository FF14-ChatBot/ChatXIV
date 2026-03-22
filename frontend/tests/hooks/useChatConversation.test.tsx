import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatConversation } from '@/hooks/useChatConversation';
import type { ChatAssistantPort } from '@/lib/chat/chatAssistantPort';
import { DEMO_ASSISTANT_REPLY } from '@/lib/chat/chatAssistantPort';

describe('useChatConversation', () => {
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
});
