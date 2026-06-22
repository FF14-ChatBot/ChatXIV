import { CACHE_KEY_PREFIX } from '../config/constants.js';

export function toCacheStorageKey(key: string): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}
