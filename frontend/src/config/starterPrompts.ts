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

export const STARTER_PROMPT_SLIDES: readonly StarterPromptSlide[] = [
  {
    id: 'progression-patches-gathering',
    items: [
      { emoji: '📜', category: 'Main story', prompt: 'Where am I in the MSQ?' },
      {
        emoji: '📋',
        category: 'Patch notes',
        prompt: 'What were the changes in the latest patch notes?',
      },
      {
        emoji: '⛏️',
        category: 'Gathering',
        prompt: 'What are the current gatherable timed nodes?',
      },
    ],
  },
  {
    id: 'jobs-zones-unlocks',
    items: [
      { emoji: '🥋', category: 'Job rotation', prompt: "What is Monk's rotation for Endwalker?" },
      {
        emoji: '🪶',
        category: 'Exploration',
        prompt: 'Where are the Aether currents in Coerthas Western Highlands?',
      },
      { emoji: '🗡️', category: 'Job unlock', prompt: 'How do I unlock Ninja?' },
    ],
  },
  {
    id: 'raids-items-mechs',
    items: [
      { emoji: '⚔️', category: 'Best-in-slot', prompt: 'What is BiS for Melee DPS in UCoB?' },
      {
        emoji: '🥚',
        category: 'Items & vendors',
        prompt: 'Where is the NPC that I can purchase Egg of Elpis from?',
      },
      {
        emoji: '✨',
        category: 'Raid mechanics',
        prompt: 'Please show me the mechs for Light Rampant in FRU!',
      },
    ],
  },
];

/** Synchronous read of bundled defaults (tests and non-React callers). */
export function getStarterPromptSlides(): readonly StarterPromptSlide[] {
  return STARTER_PROMPT_SLIDES;
}
