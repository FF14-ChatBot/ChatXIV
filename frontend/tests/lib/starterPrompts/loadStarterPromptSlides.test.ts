import { describe, expect, it } from 'vitest';
import { loadStarterPromptSlides } from '@/lib/starterPrompts/loadStarterPromptSlides';
import { STARTER_PROMPT_SLIDES } from '@/config/starterPrompts';

describe('loadStarterPromptSlides', () => {
  it('resolves to bundled slides until the API is wired', async () => {
    await expect(loadStarterPromptSlides()).resolves.toBe(STARTER_PROMPT_SLIDES);
  });
});
