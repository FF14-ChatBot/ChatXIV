import { describe, it, expect } from 'vitest';
import { createCachedUpstreamPayload } from '@src/lib/cache/cachedUpstreamPayload.js';

describe('cachedUpstreamPayload', () => {
  it('createCachedUpstreamPayload stores data and attribution with fetchedAt', () => {
    const payload = createCachedUpstreamPayload(
      { ok: true },
      {
        sourceName: 'XIVAPI',
        sourceUrl: 'https://v2.xivapi.com/',
        patchOrDate: '2025.01.01',
      }
    );

    expect(payload.data).toEqual({ ok: true });
    expect(payload.sourceName).toBe('XIVAPI');
    expect(payload.sourceUrl).toBe('https://v2.xivapi.com/');
    expect(payload.patchOrDate).toBe('2025.01.01');
    expect(payload.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('createCachedUpstreamPayload omits optional attribution fields', () => {
    const payload = createCachedUpstreamPayload([], { sourceName: 'MediaWiki' });

    expect(payload.sourceUrl).toBeUndefined();
    expect(payload.patchOrDate).toBeUndefined();
    expect(payload.lastUpdated).toBeUndefined();
  });
});
