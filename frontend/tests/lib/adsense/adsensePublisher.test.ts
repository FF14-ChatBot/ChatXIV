import { describe, expect, it } from 'vitest';
import { parseAdsensePublisherClient } from '@/lib/adsense/adsensePublisher';

describe('parseAdsensePublisherClient', () => {
  it('accepts valid ca-pub ids with trim', () => {
    expect(parseAdsensePublisherClient('  ca-pub-1234567890123456  ')).toBe(
      'ca-pub-1234567890123456'
    );
  });

  it('rejects blank or malformed', () => {
    expect(parseAdsensePublisherClient('')).toBeUndefined();
    expect(parseAdsensePublisherClient('   ')).toBeUndefined();
    expect(parseAdsensePublisherClient('pub-123')).toBeUndefined();
    expect(parseAdsensePublisherClient('ca-pub-letters')).toBeUndefined();
  });
});
