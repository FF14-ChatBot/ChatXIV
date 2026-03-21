export const UsageCategory = {
  UNCATEGORIZED: 'uncategorized',
  BIS: 'bis',
  RAIDING: 'raiding',
  MSQ: 'msq',
  UNLOCKS: 'unlocks',
  SETTINGS: 'settings',
  CRAFTING: 'crafting',
  WHERE_TO_FIND: 'where_to_find',
  PATCH_NOTES: 'patch_notes',
} as const;

export type UsageCategory = (typeof UsageCategory)[keyof typeof UsageCategory];

export const USAGE_CATEGORIES = Object.values(UsageCategory) as UsageCategory[];

/** Response shape for "usage counts by category" dashboard API. */
export type UsageByCategoryResponse = Record<UsageCategory, number>;
