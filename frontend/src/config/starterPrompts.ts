import { UsageCategory, type UsageCategory as UsageCategoryValue } from '@chatxiv/cdm';

/**
 * Welcome-screen suggested questions (carousel slides).
 * Each card uses emoji + short category (primes expectations) + the question sent on click.
 * Async resolution and API fallback: `loadStarterPromptSlides` in `lib/starterPrompts/`.
 */
export type StarterPromptCard = {
  readonly emoji: string;
  readonly category: string;
  readonly prompt: string;
};

export type StarterPromptSlide = {
  readonly id: string;
  readonly items: readonly StarterPromptCard[];
};

export const USAGE_CATEGORY_EMOJI: Readonly<Record<UsageCategoryValue, string>> = {
  [UsageCategory.UNCATEGORIZED]: '❓',
  [UsageCategory.BIS]: '🥋',
  [UsageCategory.RAIDING]: '⚔️',
  [UsageCategory.MSQ]: '📜',
  [UsageCategory.UNLOCKS]: '🔐',
  [UsageCategory.SETTINGS]: '⚙️',
  [UsageCategory.CRAFTING]: '🛠️',
  [UsageCategory.GATHERING]: '⛏️',
  [UsageCategory.ITEMS]: '📦',
  [UsageCategory.VENDORS]: '💰',
  [UsageCategory.EXPLORATION]: '🗺️',
  [UsageCategory.BLUE_MAGE]: '📘',
  [UsageCategory.FIELD_OPERATIONS]: '🏕️',
  [UsageCategory.DEEP_DUNGEONS]: '🕳️',
  [UsageCategory.GLAMOUR]: '👗',
  [UsageCategory.HOUSING]: '🏠',
  [UsageCategory.PVP]: '🏆',
  [UsageCategory.FATES]: '🎯',
  [UsageCategory.LIFESTYLE_CONTENT]: '🌿',
  [UsageCategory.RELIC_WEAPONS]: '🗡️',
  [UsageCategory.CRITERION]: '🛤️',
  [UsageCategory.COLLECTIBLES]: '🐴',
  [UsageCategory.PATCH_NOTES]: '📋',
  [UsageCategory.GOLD_SAUCER]: '🎰',
  [UsageCategory.SEASONAL_EVENTS]: '🎉',
};

type StarterPromptSeed = {
  readonly category: UsageCategoryValue | readonly UsageCategoryValue[];
  readonly prompt: string;
};

type StarterPromptSlideSeed = {
  readonly id: string;
  readonly items: readonly StarterPromptSeed[];
};

const STARTER_PROMPT_SLIDE_SEEDS: readonly StarterPromptSlideSeed[] = [
  {
    id: 'progression-patches-gathering',
    items: [
      { category: UsageCategory.MSQ, prompt: 'Where am I in the MSQ?' },
      {
        category: UsageCategory.PATCH_NOTES,
        prompt: 'What were the changes in the latest patch notes?',
      },
      {
        category: UsageCategory.GATHERING,
        prompt: 'What are the current gatherable timed nodes?',
      },
    ],
  },
  {
    id: 'jobs-zones-unlocks',
    items: [
      { category: UsageCategory.RAIDING, prompt: "What is Monk's rotation for Endwalker?" },
      {
        category: UsageCategory.EXPLORATION,
        prompt: 'Where are the Aether currents in Coerthas Western Highlands?',
      },
      { category: UsageCategory.UNLOCKS, prompt: 'How do I unlock Ninja?' },
    ],
  },
  {
    id: 'raids-items-mechs',
    items: [
      { category: UsageCategory.BIS, prompt: 'What is BiS for Melee DPS in UCoB?' },
      {
        category: [UsageCategory.ITEMS, UsageCategory.VENDORS],
        prompt: 'Where is the NPC that I can purchase Egg of Elpis from?',
      },
      {
        category: UsageCategory.RAIDING,
        prompt: 'Please show me the mechs for Light Rampant in FRU!',
      },
    ],
  },
];

function toStarterPromptCard(item: StarterPromptSeed): StarterPromptCard {
  const categories = Array.isArray(item.category) ? item.category : [item.category];
  const displayCategory = categories.join(' & ');
  const firstCategory = categories[0] ?? UsageCategory.UNCATEGORIZED;

  return {
    emoji: USAGE_CATEGORY_EMOJI[firstCategory],
    category: displayCategory,
    prompt: item.prompt,
  };
}

export const STARTER_PROMPT_SLIDES: readonly StarterPromptSlide[] = STARTER_PROMPT_SLIDE_SEEDS.map(
  (slide) => ({
    id: slide.id,
    items: slide.items.map(toStarterPromptCard),
  })
);

/** Synchronous read of bundled defaults (tests and non-React callers). */
export function getStarterPromptSlides(): readonly StarterPromptSlide[] {
  return STARTER_PROMPT_SLIDES;
}
