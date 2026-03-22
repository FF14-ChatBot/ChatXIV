import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Base appearance when no scenic preset is active. */
export type ColorMode = 'light' | 'dark';
/** Scenic preset overrides ColorMode for visuals until cleared. */
export type ThemePreset = 'none' | 'island';

const COLOR_MODE_STORAGE_KEY = 'chatxiv-theme';
const THEME_PRESET_STORAGE_KEY = 'chatxiv-theme-preset';
/** Legacy: was only applied when theme was light; migrate into preset. */
const LEGACY_LIGHT_SCHEME_KEY = 'chatxiv-light-scheme';

type ThemeContextValue = {
  readonly theme: ColorMode;
  readonly themePreset: ThemePreset;
  readonly setThemePreset: (preset: ThemePreset) => void;
  readonly toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'dark';
}

function readStoredPreset(): ThemePreset {
  try {
    const v = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (v === 'island' || v === 'none') return v;
    const legacy = localStorage.getItem(LEGACY_LIGHT_SCHEME_KEY);
    if (legacy === 'island') return 'island';
  } catch {
    /* localStorage unavailable */
  }
  return 'none';
}

function syncDocument(colorMode: ColorMode, themePreset: ThemePreset) {
  if (themePreset === 'island') {
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.themePreset = 'island';
  } else {
    delete document.documentElement.dataset.themePreset;
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }
  delete document.documentElement.dataset.lightScheme;
}

function persist(colorMode: ColorMode, themePreset: ThemePreset) {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, themePreset);
    localStorage.removeItem(LEGACY_LIGHT_SCHEME_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setTheme] = useState<ColorMode>(() => readStoredColorMode());
  const [themePreset, setThemePresetState] = useState<ThemePreset>(() => readStoredPreset());

  useLayoutEffect(() => {
    syncDocument(theme, themePreset);
    persist(theme, themePreset);
  }, [theme, themePreset]);

  const setThemePreset = useCallback((preset: ThemePreset) => {
    setThemePresetState(preset);
  }, []);

  /** Clears scenic preset and flips light/dark. */
  const toggleTheme = useCallback(() => {
    setThemePresetState('none');
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({ theme, themePreset, setThemePreset, toggleTheme }),
    [theme, themePreset, setThemePreset, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
