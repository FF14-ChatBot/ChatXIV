import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSlots = vi.hoisted(() => ({
  welcome: '',
  messages: '',
}));

vi.mock('@/lib/adsense/adsenseConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adsense/adsenseConfig')>();
  return {
    ...actual,
    getAdsenseClient: () => undefined,
    ADSENSE_DISPLAY_SLOTS: mockSlots,
  };
});

import { AdsensePlacement } from '@/lib/adsense/adsenseConfig';
import { getAdsenseDisplaySlot } from '@/lib/adsense/adsenseRegistry';

describe('getAdsenseDisplaySlot', () => {
  beforeEach(() => {
    mockSlots.welcome = '';
    mockSlots.messages = '';
  });

  it('returns undefined when slot is blank', () => {
    expect(getAdsenseDisplaySlot(AdsensePlacement.Welcome)).toBeUndefined();
    expect(getAdsenseDisplaySlot(AdsensePlacement.Messages)).toBeUndefined();
  });

  it('returns trimmed slot id from config', () => {
    mockSlots.welcome = '  42  ';
    mockSlots.messages = '8';
    expect(getAdsenseDisplaySlot(AdsensePlacement.Welcome)).toBe('42');
    expect(getAdsenseDisplaySlot(AdsensePlacement.Messages)).toBe('8');
  });
});
