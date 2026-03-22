import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { loadAdsenseScript } from '@/lib/adsense/loadAdsenseScript';

describe('loadAdsenseScript', () => {
  beforeEach(() => {
    document.head
      .querySelectorAll('script[data-chatxiv-adsense-loader]')
      .forEach((n) => n.remove());
  });

  afterEach(() => {
    document.head
      .querySelectorAll('script[data-chatxiv-adsense-loader]')
      .forEach((n) => n.remove());
  });

  it('appends the official adsbygoogle script once', () => {
    loadAdsenseScript('ca-pub-test');
    const scripts = document.head.querySelectorAll('script[data-chatxiv-adsense-loader]');
    expect(scripts).toHaveLength(1);
    const s = scripts[0] as HTMLScriptElement;
    expect(s.async).toBe(true);
    expect(s.crossOrigin).toBe('anonymous');
    expect(s.src).toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    expect(s.src).toContain(encodeURIComponent('ca-pub-test'));
  });

  it('is idempotent', () => {
    loadAdsenseScript('ca-pub-test');
    loadAdsenseScript('ca-pub-test');
    expect(document.head.querySelectorAll('script[data-chatxiv-adsense-loader]')).toHaveLength(1);
  });

  it('ignores blank client', () => {
    loadAdsenseScript('   ');
    expect(document.head.querySelectorAll('script[data-chatxiv-adsense-loader]')).toHaveLength(0);
  });
});
