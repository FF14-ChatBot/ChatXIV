import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSlots = vi.hoisted(() => ({
  welcome: '',
  messages: '',
}));

vi.mock('@/lib/adsense/adsenseConfig', () => ({
  getAdsenseClient: () => undefined,
  ADSENSE_DISPLAY_SLOTS: mockSlots,
}));

import { getAdsenseDisplaySlot } from '@/lib/adsense/adsenseRegistry';

describe('getAdsenseDisplaySlot', () => {
  beforeEach(() => {
    mockSlots.welcome = '';
    mockSlots.messages = '';
  });

  it('returns undefined when slot is blank', () => {
    expect(getAdsenseDisplaySlot('welcome')).toBeUndefined();
    expect(getAdsenseDisplaySlot('messages')).toBeUndefined();
  });

  it('returns trimmed slot id from config', () => {
    mockSlots.welcome = '  42  ';
    mockSlots.messages = '8';
    expect(getAdsenseDisplaySlot('welcome')).toBe('42');
    expect(getAdsenseDisplaySlot('messages')).toBe('8');
  });
});
