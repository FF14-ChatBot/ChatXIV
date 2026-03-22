import { STARTER_PROMPT_SLIDES, type StarterPromptSlide } from '../../config/starterPrompts';

/**
 * Resolves carousel slides for the welcome screen.
 *
 * TODO: When the backend exposes popular / most-searched prompts, fetch here (e.g. via
 * chatxivApiRequest), pass the JSON array into `normalizePopularPromptsToSlides` from
 * `./normalizePopularPrompts`, and return that result when non-empty. On network errors, bad
 * payloads, or empty normalization, return `STARTER_PROMPT_SLIDES` so the UI always has a full
 * carousel.
 */
export async function loadStarterPromptSlides(): Promise<readonly StarterPromptSlide[]> {
  try {
    // TODO: const raw = await fetchPopularSearchPromptsFromApi(9);
    // TODO: const fromApi = normalizePopularPromptsToSlides(raw);
    // TODO: return fromApi.length > 0 ? fromApi : STARTER_PROMPT_SLIDES;
    return STARTER_PROMPT_SLIDES;
  } catch {
    /* v8 ignore next */
    return STARTER_PROMPT_SLIDES;
  }
}
