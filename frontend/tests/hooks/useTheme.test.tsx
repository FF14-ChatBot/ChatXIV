import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { ColorMode, ThemePreset, THEME_STORAGE_KEYS } from '@/theme/themeConstants';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function wrapper({ children }: { readonly children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.themePreset;
    delete document.documentElement.dataset.lightScheme;
    mockMatchMedia(false);
  });

  it('reads light/dark from localStorage when set', () => {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, ColorMode.Light);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(ColorMode.Light);
  });

  it('defaults to dark when localStorage empty', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(ColorMode.Dark);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('defaults to dark when matchMedia unavailable', () => {
    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(ColorMode.Dark);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: original,
    });
  });

  it('toggleTheme switches color mode and syncs document class + localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(ColorMode.Dark);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe(ColorMode.Light);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEYS.COLOR_MODE)).toBe(ColorMode.Light);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe(ColorMode.Dark);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists island preset and sets data-theme-preset (no dark class)', () => {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, ColorMode.Light);
    localStorage.setItem(THEME_STORAGE_KEYS.PRESET, ThemePreset.Island);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.themePreset).toBe(ThemePreset.Island);
    expect(document.documentElement.dataset.themePreset).toBe(ThemePreset.Island);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      result.current.setThemePreset(ThemePreset.None);
    });
    expect(result.current.themePreset).toBe(ThemePreset.None);
    expect(document.documentElement.dataset.themePreset).toBeUndefined();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEYS.PRESET)).toBe(ThemePreset.None);
  });

  it('migrates legacy chatxiv-light-scheme island into theme preset', () => {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, ColorMode.Light);
    localStorage.setItem(THEME_STORAGE_KEYS.LEGACY_LIGHT_SCHEME, ThemePreset.Island);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.themePreset).toBe(ThemePreset.Island);
    expect(document.documentElement.dataset.themePreset).toBe(ThemePreset.Island);
  });

  it('toggleTheme clears island preset and flips color mode', () => {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, ColorMode.Light);
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setThemePreset(ThemePreset.Island);
    });
    expect(document.documentElement.dataset.themePreset).toBe(ThemePreset.Island);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.themePreset).toBe(ThemePreset.None);
    expect(result.current.theme).toBe(ColorMode.Dark);
    expect(document.documentElement.dataset.themePreset).toBeUndefined();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('island preset hides dark class even when stored color mode is dark', () => {
    localStorage.setItem(THEME_STORAGE_KEYS.COLOR_MODE, ColorMode.Dark);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setThemePreset(ThemePreset.Island);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset.themePreset).toBe(ThemePreset.Island);
  });

  it('throws when used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onWindowError = (event: ErrorEvent) => {
      event.preventDefault();
    };
    window.addEventListener('error', onWindowError);
    try {
      expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
    } finally {
      window.removeEventListener('error', onWindowError);
      spy.mockRestore();
    }
  });
});
