import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ChatSessionProvider, useChatSession } from '@/features/chat/ChatSessionContext';

function wrapper({ children }: { readonly children: ReactNode }) {
  return <ChatSessionProvider>{children}</ChatSessionProvider>;
}

describe('ChatSessionContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when useChatSession is used outside ChatSessionProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useChatSession())).toThrow(
      'useChatSession must be used within ChatSessionProvider'
    );
    consoleSpy.mockRestore();
  });

  it('increments sessionGeneration when startNewChat is called', () => {
    const { result } = renderHook(() => useChatSession(), { wrapper });
    expect(result.current.sessionGeneration).toBe(0);
    act(() => {
      result.current.startNewChat();
    });
    expect(result.current.sessionGeneration).toBe(1);
  });

  it('defaults landing to welcome and accepts thread landing', () => {
    const { result } = renderHook(() => useChatSession(), { wrapper });
    expect(result.current.landing).toBe('welcome');
    act(() => {
      result.current.startNewChat({ landing: 'thread' });
    });
    expect(result.current.landing).toBe('thread');
    act(() => {
      result.current.startNewChat();
    });
    expect(result.current.landing).toBe('welcome');
  });
});
