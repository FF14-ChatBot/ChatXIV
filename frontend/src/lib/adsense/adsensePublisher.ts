const CA_PUB_PATTERN = /^ca-pub-\d+$/;

/** Validates trimmed `ca-pub-…` publisher id for script URL and crawler meta. */
export function parseAdsensePublisherClient(raw: string): string | undefined {
  const t = raw.trim();
  if (t.length === 0 || !CA_PUB_PATTERN.test(t)) {
    return undefined;
  }
  return t;
}
