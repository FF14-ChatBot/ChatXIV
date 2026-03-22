import { describe, expect, it, vi, afterEach } from 'vitest';

describe('adsenseEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves client and shared slot', async () => {
    vi.stubEnv('VITE_PUBLIC_ADSENSE_CLIENT', ' ca-pub-demo ');
    vi.stubEnv('VITE_PUBLIC_ADSENSE_SLOT', ' 12345 ');
    vi.resetModules();
    const { getAdsenseClient, getAdsenseSlotWelcome, getAdsenseSlotMessages } =
      await import('@/lib/adsense/adsenseEnv');
    expect(getAdsenseClient()).toBe('ca-pub-demo');
    expect(getAdsenseSlotWelcome()).toBe('12345');
    expect(getAdsenseSlotMessages()).toBe('12345');
  });

  it('prefers placement-specific slots over shared slot', async () => {
    vi.stubEnv('VITE_PUBLIC_ADSENSE_CLIENT', 'ca-pub-x');
    vi.stubEnv('VITE_PUBLIC_ADSENSE_SLOT', 'shared');
    vi.stubEnv('VITE_PUBLIC_ADSENSE_SLOT_WELCOME', 'w1');
    vi.stubEnv('VITE_PUBLIC_ADSENSE_SLOT_MESSAGES', 'm1');
    vi.resetModules();
    const { getAdsenseSlotWelcome, getAdsenseSlotMessages } =
      await import('@/lib/adsense/adsenseEnv');
    expect(getAdsenseSlotWelcome()).toBe('w1');
    expect(getAdsenseSlotMessages()).toBe('m1');
  });

  it('returns undefined when unset', async () => {
    vi.resetModules();
    const { getAdsenseClient, getAdsenseSlotWelcome } = await import('@/lib/adsense/adsenseEnv');
    expect(getAdsenseClient()).toBeUndefined();
    expect(getAdsenseSlotWelcome()).toBeUndefined();
  });
});
