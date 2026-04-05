import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatDiscardGuard } from '@/features/chat/ChatDiscardGuard';

describe('useChatDiscardGuard', () => {
  it('throws when used outside ChatDiscardGuard', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useChatDiscardGuard())).toThrow(
      'useChatDiscardGuard must be used within ChatDiscardGuard'
    );
    consoleSpy.mockRestore();
  });
});
