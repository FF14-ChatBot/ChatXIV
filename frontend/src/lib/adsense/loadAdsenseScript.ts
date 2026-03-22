const SCRIPT_ATTR = 'data-chatxiv-adsense-loader';

/**
 * Injects the official async `adsbygoogle.js` once. Safe to call multiple times.
 * @see https://support.google.com/adsense/answer/9274634
 */
export function loadAdsenseScript(client: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const trimmed = client.trim();
  if (trimmed.length === 0) {
    return;
  }
  if (document.querySelector(`script[${SCRIPT_ATTR}]`)) {
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.chatxivAdsenseLoader = '';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(trimmed)}`;
  document.head.appendChild(script);
}
