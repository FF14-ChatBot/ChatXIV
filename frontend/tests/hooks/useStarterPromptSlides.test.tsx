import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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
});
