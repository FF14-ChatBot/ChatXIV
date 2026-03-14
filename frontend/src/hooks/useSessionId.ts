import { useState } from 'react';

const SESSION_KEY = 'chatxiv-session-id';

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}

/** Stable session ID for this tab; pass to API config for rate limiting. */
export function useSessionId(): string {
  const [id] = useState(getOrCreateSessionId);
  return id;
}
