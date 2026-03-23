export const UsageCategory = {
  UNCATEGORIZED: 'OTHER',
  BIS: 'BEST-IN-SLOT',
  RAIDING: 'RAIDING',
  MSQ: 'MSQ',
  UNLOCKS: 'UNLOCKS',
  SETTINGS: 'SETTINGS',
  CRAFTING: 'CRAFTING',
  GATHERING: 'GATHERING',
  ITEMS: 'ITEMS',
  VENDORS: 'VENDORS',
  EXPLORATION: 'EXPLORATION',
  BLUE_MAGE: 'BLUE MAGE',
  FIELD_OPERATIONS: 'FIELD OPERATIONS',
  DEEP_DUNGEONS: 'DEEP DUNGEONS',
  GLAMOUR: 'GLAMOUR',
  HOUSING: "HOUSING",
  PVP: 'PVP',
  FATES: 'FATES',
  LIFESTYLE_CONTENT: 'LIFESTYLE CONTENT',
  RELIC_WEAPONS: 'RELIC WEAPONS',
  CRITERION: 'CRITERION DUNGEONS',
  COLLECTIBLES: 'COLLECTIBLES',
  PATCH_NOTES: 'PATCH NOTES',
  GOLD_SAUCER: 'GOLD SAUCER',
  SEASONAL_EVENTS: 'SEASONAL EVENTS',
} as const;

export type UsageCategory = (typeof UsageCategory)[keyof typeof UsageCategory];

export const USAGE_CATEGORIES = Object.values(UsageCategory) as UsageCategory[];

/** Response shape for "usage counts by category" dashboard API. */
export type UsageByCategoryResponse = Record<UsageCategory, number>;
