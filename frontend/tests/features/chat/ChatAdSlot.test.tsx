import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as adsenseRegistry from '@/lib/adsense/adsenseRegistry';
import { ChatAdSlot } from '@/features/chat/ChatAdSlot';

describe('ChatAdSlot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.adsbygoogle;
  });

  it('renders placeholder aside when AdSense client or slot is unset', () => {
    vi.spyOn(adsenseRegistry, 'getAdsenseClient').mockReturnValue(undefined);
    vi.spyOn(adsenseRegistry, 'getAdsenseDisplaySlot').mockReturnValue(undefined);

    render(<ChatAdSlot placement="welcome" className="slot-class" />);
    const aside = screen.getByRole('complementary', { name: /advertisement/i });
    expect(aside).toHaveClass('slot-class');
    expect(aside.querySelector('ins.adsbygoogle')).toBeNull();
  });

  it('renders display unit when client and slot resolve', () => {
    vi.spyOn(adsenseRegistry, 'getAdsenseClient').mockReturnValue('ca-pub-1111111111111111');
    vi.spyOn(adsenseRegistry, 'getAdsenseDisplaySlot').mockReturnValue('111');
    window.adsbygoogle = [];
    vi.spyOn(window.adsbygoogle, 'push');

    render(<ChatAdSlot placement="messages" className="ad" />);

    expect(document.querySelector('ins.adsbygoogle')).toBeTruthy();
  });
});
