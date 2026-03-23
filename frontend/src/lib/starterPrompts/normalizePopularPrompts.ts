import { USAGE_CATEGORIES, type UsageCategory } from '@chatxiv/cdm';
import {
  USAGE_CATEGORY_EMOJI,
  type StarterPromptCard,
  type StarterPromptSlide,
} from '../../config/starterPrompts';

const MAX_CARDS = 9;
const CARDS_PER_SLIDE = 3;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsageCategory(value: unknown): value is UsageCategory {
  return typeof value === 'string' && (USAGE_CATEGORIES as readonly string[]).includes(value);
}

function toUsageCategoryList(value: unknown): readonly UsageCategory[] {
  if (Array.isArray(value)) {
    return value.filter(isUsageCategory);
  }
  return isUsageCategory(value) ? [value] : [];
}

/**
 * Maps a future API payload (up to 9 items) into carousel slides of three cards each.
 * Drops invalid entries and ignores trailing cards that do not complete a full slide.
 */
export function normalizePopularPromptsToSlides(
  raw: readonly unknown[]
): readonly StarterPromptSlide[] {
  const valid: StarterPromptCard[] = [];

  for (const item of raw) {
    if (valid.length >= MAX_CARDS) break;
    if (!isRecord(item)) continue;

    const categories = toUsageCategoryList(item.categories ?? item.category);
    const prompt = isNonEmptyString(item.prompt) ? item.prompt.trim() : '';

    if (categories.length === 0 || !prompt) continue;
    const firstCategory = categories[0];
    valid.push({
      emoji: USAGE_CATEGORY_EMOJI[firstCategory],
      category: categories.join(' & '),
      prompt,
    });
  }

  const slides: StarterPromptSlide[] = [];
  for (let offset = 0; offset + CARDS_PER_SLIDE <= valid.length; offset += CARDS_PER_SLIDE) {
    slides.push({
      id: `popular-${slides.length}`,
      items: valid.slice(offset, offset + CARDS_PER_SLIDE),
    });
  }

  return slides;
}
