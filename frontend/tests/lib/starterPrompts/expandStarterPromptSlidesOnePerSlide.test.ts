import { describe, expect, it } from 'vitest';
import { STARTER_PROMPT_SLIDES } from '@/config/starterPrompts';
import { expandStarterPromptSlidesOnePerSlide } from '@/lib/starterPrompts/expandStarterPromptSlidesOnePerSlide';

describe('expandStarterPromptSlidesOnePerSlide', () => {
  it('returns one card per slide in source order with stable composite ids', () => {
    const expanded = expandStarterPromptSlidesOnePerSlide(STARTER_PROMPT_SLIDES);
    expect(expanded).toHaveLength(9);
    expect(expanded[0]).toEqual({
      id: 'progression-patches-gathering__0',
      items: [STARTER_PROMPT_SLIDES[0]!.items[0]!],
    });
    expect(expanded[1]?.items[0]?.prompt).toBe('What were the changes in the latest patch notes?');
    expect(expanded[8]?.id).toBe('raids-items-mechs__2');
  });

  it('returns empty input unchanged', () => {
    expect(expandStarterPromptSlidesOnePerSlide([])).toEqual([]);
  });
});
