import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { AdsenseDisplayAd } from '@/components/AdsenseDisplayAd/AdsenseDisplayAd';

describe('AdsenseDisplayAd', () => {
  afterEach(() => {
    delete window.adsbygoogle;
    vi.unstubAllEnvs();
  });

  it('renders ins.adsbygoogle and pushes once', () => {
    window.adsbygoogle = [];
    const pushSpy = vi.spyOn(window.adsbygoogle, 'push');

    render(<AdsenseDisplayAd client="ca-pub-x" slot="999" className="ad-slot-test" />);

    const ins = document.querySelector('ins.adsbygoogle');
    expect(ins).toBeTruthy();
    expect(ins).toHaveAttribute('data-ad-client', 'ca-pub-x');
    expect(ins).toHaveAttribute('data-ad-slot', '999');
    expect(ins).toHaveAttribute('data-ad-format', 'auto');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({});
  });

  it('does not leave didPush true when push throws', () => {
    window.adsbygoogle = [];
    vi.spyOn(window.adsbygoogle, 'push').mockImplementation(() => {
      throw new Error('ads fail');
    });

    render(<AdsenseDisplayAd client="ca-pub-x" slot="999" className="ad-slot-test" />);

    expect(document.querySelector('ins.adsbygoogle')).toBeTruthy();
  });
});
