import { parseAdsensePublisherClient } from './adsensePublisher.js';

export type AdsensePlacement = 'welcome' | 'messages';

/**
 * Google AdSense publisher id (`ca-pub-…`). Public (script URL + optional crawler meta).
 * One account per product is typical; change here if you ever switch publisher.
 */
export const ADSENSE_PUBLISHER_CLIENT = 'ca-pub-2641843614227152';

/**
 * Numeric display ad unit ids (AdSense → Ads → By ad unit). Public in page HTML.
 * Reuse one id for both chat placements until you add a second ad unit.
 */
const SHARED_DISPLAY_SLOT = '8711119409';

export const ADSENSE_DISPLAY_SLOTS: Readonly<Record<AdsensePlacement, string>> = {
  welcome: SHARED_DISPLAY_SLOT,
  messages: SHARED_DISPLAY_SLOT,
};

export function getAdsenseClient(): string | undefined {
  return parseAdsensePublisherClient(ADSENSE_PUBLISHER_CLIENT);
}
