import { AdsenseDisplayAd } from '../../components/AdsenseDisplayAd/AdsenseDisplayAd';
import {
  getAdsenseClient,
  getAdsenseSlotMessages,
  getAdsenseSlotWelcome,
} from '../../lib/adsense/adsenseEnv';

interface ChatAdSlotProps {
  readonly variant: 'welcome' | 'messages';
  readonly className: string;
}

export function ChatAdSlot({ variant, className }: ChatAdSlotProps) {
  const client = getAdsenseClient();
  const slot = variant === 'welcome' ? getAdsenseSlotWelcome() : getAdsenseSlotMessages();

  if (client !== undefined && slot !== undefined) {
    return <AdsenseDisplayAd client={client} slot={slot} className={className} />;
  }

  return <aside className={className} aria-label="Advertisement" />;
}
