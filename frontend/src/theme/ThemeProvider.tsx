import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ColorMode, ThemePreset, THEME_STORAGE_KEYS } from './themeConstants';

type ThemeContextValue = {
  readonly theme: ColorMode;
  readonly themePreset: ThemePreset;
  readonly setThemePreset: (preset: ThemePreset) => void;
  readonly toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEYS.COLOR_MODE) as ColorMode | null;
    if (stored === ColorMode.Light || stored === ColorMode.Dark) return stored;
  } catch {
    /* localStorage unavailable */
  }
  return ColorMode.Dark;
}

function readStoredPreset(): ThemePreset {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEYS.PRESET);
    if (v === ThemePreset.Island || v === ThemePreset.None) return v;
    const legacy = localStorage.getItem(THEME_STORAGE_KEYS.LEGACY_LIGHT_SCHEME);
    if (legacy === ThemePreset.Island) return ThemePreset.Island;
  } catch {
    /* localStorage unavailable */
  }
  return ThemePreset.None;
}

function syncDocument(colorMode: ColorMode, themePreset: ThemePreset) {
  if (themePreset === ThemePreset.Island) {
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.themePreset = ThemePreset.Island;
  } else {
    delete document.documentElement.dataset.themePreset;
    document.documentElement.classList.toggle('dark', colorMode === ColorMode.Dark);
  }
  delete document.documentElement.dataset.lightScheme;
}

function persist(colorMode: ColorMode, themePreset: ThemePreset) {
  try {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, colorMode);
    localStorage.setItem(THEME_STORAGE_KEYS.PRESET, themePreset);
    localStorage.removeItem(THEME_STORAGE_KEYS.LEGACY_LIGHT_SCHEME);
  } catch {
    /* localStorage unavailable */
  }
}

export type { ColorMode, ThemePreset } from './themeConstants';

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
    setThemePresetState(ThemePreset.None);
    setTheme((prev) => (prev === ColorMode.Light ? ColorMode.Dark : ColorMode.Light));
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
