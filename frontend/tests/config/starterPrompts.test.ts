import { describe, expect, it } from 'vitest';
import { getStarterPromptSlides, STARTER_PROMPT_SLIDES } from '@/config/starterPrompts';

describe('starterPrompts', () => {
  it('exposes slides with ids and three cards each', () => {
    expect(STARTER_PROMPT_SLIDES.length).toBeGreaterThanOrEqual(3);
    for (const slide of STARTER_PROMPT_SLIDES) {
      expect(slide.id).toBeTruthy();
      expect(slide.items).toHaveLength(3);
      for (const item of slide.items) {
        expect(item.emoji).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.prompt).toBeTruthy();
      }
    }
  });

  it('getStarterPromptSlides returns the configured slides', () => {
    expect(getStarterPromptSlides()).toBe(STARTER_PROMPT_SLIDES);
  });
});
