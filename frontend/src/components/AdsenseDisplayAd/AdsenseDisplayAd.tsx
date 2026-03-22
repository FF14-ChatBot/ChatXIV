import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export interface AdsenseDisplayAdProps {
  readonly client: string;
  readonly slot: string;
  readonly className: string;
}

/**
 * Responsive display unit. Requires `loadAdsenseScript(client)` to have run (see `main.tsx`).
 */
export function AdsenseDisplayAd({ client, slot, className }: AdsenseDisplayAdProps) {
  const didPushRef = useRef(false);

  useEffect(() => {
    if (didPushRef.current) {
      return;
    }
    didPushRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      didPushRef.current = false;
    }
  }, []);

  return (
    <aside className={className} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
