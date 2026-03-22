import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';

const COLOR_MODE_STORAGE_KEY = 'chatxiv-theme';
const THEME_PRESET_STORAGE_KEY = 'chatxiv-theme-preset';
const LEGACY_LIGHT_SCHEME_KEY = 'chatxiv-light-scheme';

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
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
  });

  it('defaults to dark when localStorage empty', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('defaults to dark when matchMedia unavailable', () => {
    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: original,
    });
  });

  it('toggleTheme switches color mode and syncs document class + localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists island preset and sets data-theme-preset (no dark class)', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, 'island');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.themePreset).toBe('island');
    expect(document.documentElement.dataset.themePreset).toBe('island');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      result.current.setThemePreset('none');
    });
    expect(result.current.themePreset).toBe('none');
    expect(document.documentElement.dataset.themePreset).toBeUndefined();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe('none');
  });

  it('migrates legacy chatxiv-light-scheme island into theme preset', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
    localStorage.setItem(LEGACY_LIGHT_SCHEME_KEY, 'island');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.themePreset).toBe('island');
    expect(document.documentElement.dataset.themePreset).toBe('island');
  });

  it('toggleTheme clears island preset and flips color mode', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setThemePreset('island');
    });
    expect(document.documentElement.dataset.themePreset).toBe('island');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.themePreset).toBe('none');
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.themePreset).toBeUndefined();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('island preset hides dark class even when stored color mode is dark', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setThemePreset('island');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset.themePreset).toBe('island');
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
