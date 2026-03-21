import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDebug } from '@/lib/debug.js';

describe('isDebug', () => {
  const originalDev = import.meta.env.DEV;
  const originalWindow = globalThis.window;

  afterEach(() => {
    import.meta.env.DEV = originalDev;
    vi.stubGlobal('window', originalWindow);
  });

  it('returns true when import.meta.env.DEV is true', () => {
    import.meta.env.DEV = true;
    expect(isDebug()).toBe(true);
  });

  it('returns false when DEV is false and no storage or query', () => {
    import.meta.env.DEV = false;
    expect(isDebug()).toBe(false);
  });

  it('returns false when localStorage.getItem throws', () => {
    import.meta.env.DEV = false;
    const getItem = vi.fn(() => {
      throw new Error('storage unavailable');
    });
    vi.stubGlobal('localStorage', { getItem });
    expect(isDebug()).toBe(false);
  });

  it('returns false when window is undefined (SSR)', () => {
    import.meta.env.DEV = false;
    vi.stubGlobal('window', undefined);
    expect(isDebug()).toBe(false);
  });
});
