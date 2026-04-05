import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMessageFeedback } from '@/hooks/useMessageFeedback';
import { logger } from '@/lib/logger/instance';

vi.mock('@/clients/chatxivApi/feedback', () => ({
  submitFeedback: vi.fn(() => Promise.resolve({ ok: true as const })),
}));

describe('useMessageFeedback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits and reaches submitted state', async () => {
    const { submitFeedback } = await import('@/clients/chatxivApi/feedback');

    const { result } = renderHook(() => useMessageFeedback('msg-a'));

    await act(async () => {
      await result.current.submit({ rating: 'up', reasonCode: 'other' });
    });

    expect(submitFeedback).toHaveBeenCalledWith(
      { messageId: 'msg-a', rating: 'up', reasonCode: 'other' },
      undefined
    );
    await waitFor(() => {
      expect(result.current.state).toBe('submitted');
    });
    expect(result.current.submittedRating).toBe('up');
  });

  it('sets error state when submit fails', async () => {
    const { submitFeedback } = await import('@/clients/chatxivApi/feedback');
    vi.mocked(submitFeedback).mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMessageFeedback('msg-b'));

    await act(async () => {
      await result.current.submit({ rating: 'down', reasonCode: 'wrong_answer' });
    });

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    });

    act(() => {
      result.current.dismissError();
    });
    expect(result.current.state).toBe('idle');
  });

  it('logs non-Error rejections with String(reason)', async () => {
    const { submitFeedback } = await import('@/clients/chatxivApi/feedback');
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(submitFeedback).mockRejectedValueOnce('upstream');

    const { result } = renderHook(() => useMessageFeedback('msg-d'));

    await act(async () => {
      await result.current.submit({ rating: 'up', reasonCode: 'other' });
    });

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Feedback submission failed',
      expect.objectContaining({ messageId: 'msg-d', error: 'upstream' })
    );
    errorSpy.mockRestore();
  });

  it('passes API config through to submitFeedback', async () => {
    const { submitFeedback } = await import('@/clients/chatxivApi/feedback');

    const { result } = renderHook(() => useMessageFeedback('msg-c'));

    await act(async () => {
      await result.current.submit(
        { rating: 'up', reasonCode: 'other' },
        { baseUrl: 'http://example.test' }
      );
    });

    expect(submitFeedback).toHaveBeenCalledWith(
      { messageId: 'msg-c', rating: 'up', reasonCode: 'other' },
      { config: { baseUrl: 'http://example.test' } }
    );
  });
});
