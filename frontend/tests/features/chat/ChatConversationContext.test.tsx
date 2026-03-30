import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatConversationContext } from '@/features/chat/ChatConversationContext';

describe('useChatConversationContext', () => {
  it('throws when used outside ChatConversationProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useChatConversationContext())).toThrow(
      'useChatConversationContext must be used within ChatConversationProvider'
    );
    consoleSpy.mockRestore();
  });
});
