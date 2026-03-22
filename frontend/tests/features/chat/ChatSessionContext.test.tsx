import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ChatSessionProvider, useChatSession } from '@/features/chat/ChatSessionContext';

function wrapper({ children }: { readonly children: ReactNode }) {
  return <ChatSessionProvider>{children}</ChatSessionProvider>;
}

describe('ChatSessionContext', () => {
  it('increments sessionGeneration when startNewChat is called', () => {
    const { result } = renderHook(() => useChatSession(), { wrapper });
    expect(result.current.sessionGeneration).toBe(0);
    act(() => {
      result.current.startNewChat();
    });
    expect(result.current.sessionGeneration).toBe(1);
  });
});
