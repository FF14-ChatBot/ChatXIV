import type { StarterPromptSlide } from '../../config/starterPrompts';

/**
 * On narrow viewports each slide shows a single suggestion so the block above the ad stays
 * shorter (better ad viewability). Preserves slide order and card order within slides.
 */
export function expandStarterPromptSlidesOnePerSlide(
  slides: readonly StarterPromptSlide[]
): readonly StarterPromptSlide[] {
  if (slides.length === 0) {
    return slides;
  }

  const expanded: StarterPromptSlide[] = [];
  for (const slide of slides) {
    slide.items.forEach((card, itemIndex) => {
      expanded.push({
        id: `${slide.id}__${itemIndex}`,
        items: [card],
      });
    });
  }
  return expanded;
}
