import { AdsenseDisplayAd } from '../../components/AdsenseDisplayAd/AdsenseDisplayAd';
import {
  type AdsensePlacement,
  getAdsenseClient,
  getAdsenseDisplaySlot,
} from '../../lib/adsense/adsenseRegistry';

interface ChatAdSlotProps {
  readonly placement: AdsensePlacement;
  readonly className: string;
}

export function ChatAdSlot({ placement, className }: ChatAdSlotProps) {
  const client = getAdsenseClient();
  const slot = getAdsenseDisplaySlot(placement);

  if (client !== undefined && slot !== undefined) {
    return <AdsenseDisplayAd client={client} slot={slot} className={className} />;
  }

  return <aside className={className} aria-label="Advertisement" />;
}
