export const ColorMode = {
  Light: 'light',
  Dark: 'dark',
} as const;
export type ColorMode = (typeof ColorMode)[keyof typeof ColorMode];

export const ThemePreset = {
  None: 'none',
  Island: 'island',
} as const;
export type ThemePreset = (typeof ThemePreset)[keyof typeof ThemePreset];

export const THEME_STORAGE_KEYS = {
  COLOR_MODE: 'chatxiv-theme',
  PRESET: 'chatxiv-theme-preset',
  /** Legacy: was only applied when theme was light; migrate into preset. */
  LEGACY_LIGHT_SCHEME: 'chatxiv-light-scheme',
} as const;
