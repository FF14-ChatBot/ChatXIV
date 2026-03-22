import { type AdsensePlacement, ADSENSE_DISPLAY_SLOTS, getAdsenseClient } from './adsenseConfig.js';
import { trimNonEmpty } from './trimNonEmpty.js';

export type { AdsensePlacement } from './adsenseConfig.js';
export { getAdsenseClient };

/** Resolved slot id for a UI placement, or `undefined` if that placement is not configured. */
export function getAdsenseDisplaySlot(placement: AdsensePlacement): string | undefined {
  return trimNonEmpty(ADSENSE_DISPLAY_SLOTS[placement]);
}
