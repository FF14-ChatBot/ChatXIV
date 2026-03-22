import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStarterPromptSlides } from '@/hooks/useStarterPromptSlides';
import * as loader from '@/lib/starterPrompts/loadStarterPromptSlides';
import { STARTER_PROMPT_SLIDES } from '@/config/starterPrompts';

describe('useStarterPromptSlides', () => {
  beforeEach(() => {
    vi.spyOn(loader, 'loadStarterPromptSlides').mockResolvedValue(STARTER_PROMPT_SLIDES);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with bundled slides then syncs loader result', async () => {
    const { result } = renderHook(() => useStarterPromptSlides());
    expect(result.current).toBe(STARTER_PROMPT_SLIDES);
    await waitFor(() => {
      expect(loader.loadStarterPromptSlides).toHaveBeenCalled();
    });
    expect(result.current).toBe(STARTER_PROMPT_SLIDES);
  });

  it('ignores loader result after unmount', async () => {
    let resolveLoader!: (value: typeof STARTER_PROMPT_SLIDES) => void;
    const deferred = new Promise<typeof STARTER_PROMPT_SLIDES>((resolve) => {
      resolveLoader = resolve;
    });
    vi.spyOn(loader, 'loadStarterPromptSlides').mockReturnValue(deferred);

    const { unmount } = renderHook(() => useStarterPromptSlides());
    unmount();
    await act(async () => {
      resolveLoader(STARTER_PROMPT_SLIDES);
    });
  });
});
