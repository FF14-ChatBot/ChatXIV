const DEBUG_STORAGE_KEY = 'chatxiv-debug';

function getStoredDebugFlag(): boolean {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function hasDebugQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

/**
 * True when dev mode (Vite), localStorage has chatxiv-debug=1, or URL has ?debug=1.
 * Used by logger so debug logs no-op in production unless explicitly enabled.
 */
export function isDebug(): boolean {
  return import.meta.env.DEV === true || getStoredDebugFlag() || hasDebugQuery();
}
