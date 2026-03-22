import { useEffect, useState } from 'react';
import { STARTER_PROMPT_SLIDES, type StarterPromptSlide } from '../config/starterPrompts';
import { loadStarterPromptSlides } from '../lib/starterPrompts/loadStarterPromptSlides';

/**
 * Carousel data: bundled slides immediately, then optional refresh when `loadStarterPromptSlides`
 * is wired to the API (same fallback behavior as the loader).
 */
export function useStarterPromptSlides(): readonly StarterPromptSlide[] {
  const [slides, setSlides] = useState<readonly StarterPromptSlide[]>(STARTER_PROMPT_SLIDES);

  useEffect(() => {
    let cancelled = false;
    void loadStarterPromptSlides().then((next) => {
      if (!cancelled) {
        setSlides(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return slides;
}
