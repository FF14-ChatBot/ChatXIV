/**
 * Supported locales for UI copy, chat `language`, and backend keyword routing.
 * Extend when adding locales; keep keyword rulesets and translations aligned with these codes.
 */
export const Languages = {
  En: 'en',
} as const;

export type Language = (typeof Languages)[keyof typeof Languages];
