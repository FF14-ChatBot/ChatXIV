import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatAdSlot } from '@/features/chat/ChatAdSlot';

describe('ChatAdSlot', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.adsbygoogle;
  });

  it('renders placeholder aside when AdSense env is unset', () => {
    render(<ChatAdSlot variant="welcome" className="slot-class" />);
    const aside = screen.getByRole('complementary', { name: /advertisement/i });
    expect(aside).toHaveClass('slot-class');
    expect(aside.querySelector('ins.adsbygoogle')).toBeNull();
  });

  it('renders display unit when client and slot are set', async () => {
    vi.stubEnv('VITE_PUBLIC_ADSENSE_CLIENT', 'ca-pub-test');
    vi.stubEnv('VITE_PUBLIC_ADSENSE_SLOT', '111');
    vi.resetModules();
    window.adsbygoogle = [];
    vi.spyOn(window.adsbygoogle, 'push');

    const { ChatAdSlot: ChatAdSlotFresh } = await import('@/features/chat/ChatAdSlot');
    render(<ChatAdSlotFresh variant="messages" className="ad" />);

    expect(document.querySelector('ins.adsbygoogle')).toBeTruthy();
  });
});
