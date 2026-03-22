function trimNonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function firstSlot(...candidates: readonly unknown[]): string | undefined {
  for (const c of candidates) {
    const s = trimNonEmpty(c);
    if (s !== undefined) {
      return s;
    }
  }
  return undefined;
}

/** AdSense `ca-pub-…` client id from the async script URL. */
export function getAdsenseClient(): string | undefined {
  return trimNonEmpty(import.meta.env.VITE_PUBLIC_ADSENSE_CLIENT);
}

/** Display ad slot for the empty-state (welcome) column. */
export function getAdsenseSlotWelcome(): string | undefined {
  return firstSlot(
    import.meta.env.VITE_PUBLIC_ADSENSE_SLOT_WELCOME,
    import.meta.env.VITE_PUBLIC_ADSENSE_SLOT
  );
}

/** Display ad slot under the message list (conversation view). */
export function getAdsenseSlotMessages(): string | undefined {
  return firstSlot(
    import.meta.env.VITE_PUBLIC_ADSENSE_SLOT_MESSAGES,
    import.meta.env.VITE_PUBLIC_ADSENSE_SLOT
  );
}
