import { describe, it, expect } from 'vitest';
import { xivApiSearchCacheKey } from '@src/lib/cache/cacheCategoryKeys.js';

describe('cacheCategoryKeys', () => {
  it('xivApiSearchCacheKey is stable for the same inputs', () => {
    const params = { query: 'Potion', language: 'en', limit: 8 };
    expect(xivApiSearchCacheKey(params)).toBe(xivApiSearchCacheKey(params));
  });

  it('xivApiSearchCacheKey normalizes query casing and whitespace', () => {
    expect(xivApiSearchCacheKey({ query: '  Potion ', language: 'en', limit: 8 })).toBe(
      xivApiSearchCacheKey({ query: 'potion', language: 'en', limit: 8 })
    );
  });

  it('xivApiSearchCacheKey varies by language and limit', () => {
    const base = xivApiSearchCacheKey({ query: 'potion', language: 'en', limit: 8 });
    expect(xivApiSearchCacheKey({ query: 'potion', language: 'ja', limit: 8 })).not.toBe(base);
    expect(xivApiSearchCacheKey({ query: 'potion', language: 'en', limit: 4 })).not.toBe(base);
  });

  it('xivApiSearchCacheKey uses the full SHA-256 hex digest', () => {
    const key = xivApiSearchCacheKey({ query: 'potion', language: 'en', limit: 8 });
    expect(key).toMatch(/^xivapi:search:en:[a-f0-9]{64}$/);
  });
});
