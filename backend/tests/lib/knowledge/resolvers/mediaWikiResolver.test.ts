import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { createMediaWikiResolver } from '@src/lib/knowledge/resolvers/mediaWikiResolver.js';
import { MediaWikiWikiId } from '@src/lib/config/constants.js';
import type { MediaWikiSearchResultEntry } from '@src/lib/mediawiki/types.js';
import { createMockMediaWikiClient } from '@test/mocks/mediaWikiClient.mock.js';
import { createMockCacheClient } from '@test/mocks/cacheClient.mock.js';
import { cacheHit } from '@src/lib/cache/cacheGetResult.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';
import {
  mediaWikiParseResponseThinFixture,
  mediaWikiParseResponseWithInfoboxFixture,
  mediaWikiParseResponseWithNestedTableFixture,
  mediaWikiParseResponseWithSelfClosingTableFixture,
} from '@test/fixtures/mediawiki.fixtures.js';
import type pino from 'pino';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

const baseUrls = {
  [MediaWikiWikiId.ConsoleGamesWiki]: 'https://ffxiv.consolegameswiki.com/mediawiki/api.php',
  [MediaWikiWikiId.FandomFfxiv]: 'https://finalfantasy.fandom.com/api.php',
};

function searchEntry(
  overrides: Partial<MediaWikiSearchResultEntry> = {}
): MediaWikiSearchResultEntry {
  return {
    ns: 0,
    title: 'Palace of the Dead',
    pageid: 5310,
    size: 2048,
    wordcount: 300,
    snippet: 'A <span class="searchmatch">deep dungeon</span> accessible from Quarrymill.',
    timestamp: '2024-11-02T18:23:41Z',
    ...overrides,
  };
}

function searchResponse(entries: MediaWikiSearchResultEntry[]) {
  return { query: { search: entries } };
}

describe('lib/knowledge/resolvers/mediaWikiResolver', () => {
  beforeEach(() => {
    cacheBackendHealth.configure('memory');
  });

  function setup() {
    const client = createMockMediaWikiClient();
    const cache = createMockCacheClient();
    const log = createMockLogger();
    const resolver = createMediaWikiResolver(client, cache, baseUrls, [UsageCategory.UNLOCKS], log);
    return { client, cache, log, resolver };
  }

  it('exposes the categories it was constructed with', () => {
    const { resolver } = setup();
    expect(resolver.supportedCategories).toEqual([UsageCategory.UNLOCKS]);
  });

  it('declines without any network calls when options.category is a category it does not support', async () => {
    const { client, resolver } = setup();

    const chunks = await resolver.resolve('what is BiS for Dark Knight', {
      category: UsageCategory.BIS,
      topK: 8,
    });

    expect(chunks).toEqual([]);
    expect(client.search).not.toHaveBeenCalled();
    expect(client.parse).not.toHaveBeenCalled();
  });

  it('still does real work when options.category matches a supported category', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry()]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('how do I unlock the Palace of the Dead', {
      category: UsageCategory.UNLOCKS,
      topK: 8,
    });

    expect(chunks).toHaveLength(1);
    expect(client.search).toHaveBeenCalled();
  });

  it('still does real work when options.category is undefined (direct-call / UNCATEGORIZED fan-out with no category info)', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry()]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('how do I unlock the Palace of the Dead', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(client.search).toHaveBeenCalled();
  });

  it('builds a chunk from a successful ConsoleGamesWiki search + parse', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry()]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('how do I unlock the Palace of the Dead', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source).toEqual({
      sourceName: 'Palace of the Dead',
      sourceUrl: 'https://ffxiv.consolegameswiki.com/mediawiki/index.php?title=Palace+of+the+Dead',
      lastUpdated: '2024-11-02T18:23:41Z',
    });
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      expect.any(String),
      2, // clamped to MAX_PAGES_TO_PARSE, not the raw topK (8) -- see MAX_PAGES_TO_PARSE test below
      undefined
    );
    expect(client.parse).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      { page: 'Palace of the Dead' },
      undefined
    );
  });

  it('strips infobox table content out of the chunk text', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry()]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('unlock the palace of the dead', { topK: 8 });

    expect(chunks[0]?.text).not.toContain('Patch Added');
    expect(chunks[0]?.text).not.toContain('3.35');
    expect(chunks[0]?.text).toContain('deep dungeon accessible from Quarrymill');
    expect(chunks[0]?.text).toContain('"Deep Dungeon Duty"'); // decoded &quot;, from prose
  });

  it("sets a decreasing score based on the wiki's own search-result rank", async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(
      searchResponse([searchEntry({ title: 'Top Match' }), searchEntry({ title: 'Second Match' })])
    );
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('unlock something', { topK: 8 });

    expect(chunks).toHaveLength(2);
    const topChunk = chunks.find((c) => c.source.sourceName === 'Top Match');
    const secondChunk = chunks.find((c) => c.source.sourceName === 'Second Match');
    expect(topChunk?.score).toBe(1);
    expect(secondChunk?.score).toBe(0.5);
    expect(topChunk?.score).toBeGreaterThan(secondChunk?.score ?? 0);
  });

  it('truncates a very long chat message before sending it as the wiki search term', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));
    const longMessage = `how do I unlock the Palace of the Dead ${'x'.repeat(12_000)}`;

    await resolver.resolve(longMessage, { topK: 8 });

    const sentQuery = client.search.mock.calls[0]?.[1] as string;
    expect(sentQuery.length).toBeLessThanOrEqual(300);
    expect(longMessage.length).toBeGreaterThan(300);
  });

  it('builds a correct article URL even when the configured base URL has a trailing slash', async () => {
    const client = createMockMediaWikiClient();
    const cache = createMockCacheClient();
    const log = createMockLogger();
    const trailingSlashBaseUrls = {
      [MediaWikiWikiId.ConsoleGamesWiki]: 'https://ffxiv.consolegameswiki.com/mediawiki/api.php/',
      [MediaWikiWikiId.FandomFfxiv]: 'https://finalfantasy.fandom.com/api.php',
    };
    const resolver = createMediaWikiResolver(
      client,
      cache,
      trailingSlashBaseUrls,
      [UsageCategory.UNLOCKS],
      log
    );
    client.search.mockResolvedValue(searchResponse([searchEntry()]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('unlock the palace of the dead', { topK: 8 });

    expect(chunks[0]?.source.sourceUrl).toBe(
      'https://ffxiv.consolegameswiki.com/mediawiki/index.php?title=Palace+of+the+Dead'
    );
  });

  it('strips a NESTED infobox table entirely, not just up to its inner close tag', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry({ title: 'Heaven-on-High' })]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithNestedTableFixture);

    const chunks = await resolver.resolve('unlock Heaven-on-High', {
      category: UsageCategory.UNLOCKS,
      topK: 8,
    });

    expect(chunks[0]?.text).not.toContain('Leaked Infobox Label');
    expect(chunks[0]?.text).not.toContain('Leaked Value');
    expect(chunks[0]?.text).not.toContain('sub-table cell');
    expect(chunks[0]?.text).toContain('Heaven-on-High is a deep dungeon accessible from Kugane');
  });

  it('falls back to Fandom FFXIV when ConsoleGamesWiki returns no search hits', async () => {
    const { client, resolver } = setup();
    client.search.mockImplementation((wikiId) =>
      Promise.resolve(
        wikiId === MediaWikiWikiId.ConsoleGamesWiki
          ? searchResponse([])
          : searchResponse([searchEntry({ title: 'Fandom Unlock Page' })])
      )
    );
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('unlock something obscure', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.FandomFfxiv,
      'unlock something obscure Final Fantasy XIV',
      2,
      undefined
    );
    expect(client.parse).toHaveBeenCalledWith(
      MediaWikiWikiId.FandomFfxiv,
      { page: 'Fandom Unlock Page' },
      undefined
    );
  });

  it('falls back to Fandom FFXIV when every ConsoleGamesWiki page is too thin', async () => {
    const { client, resolver } = setup();
    client.search.mockImplementation((wikiId) =>
      Promise.resolve(
        wikiId === MediaWikiWikiId.ConsoleGamesWiki
          ? searchResponse([searchEntry({ title: 'Stub Page' })])
          : searchResponse([searchEntry({ title: 'Real Page' })])
      )
    );
    client.parse.mockImplementation((wikiId) =>
      Promise.resolve(
        wikiId === MediaWikiWikiId.ConsoleGamesWiki
          ? mediaWikiParseResponseThinFixture
          : mediaWikiParseResponseWithInfoboxFixture
      )
    );

    const chunks = await resolver.resolve('unlock a thin page', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceName).toBe('Real Page');
  });

  it('returns an empty array when both wikis have nothing usable', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));

    const chunks = await resolver.resolve('nothing findable anywhere', { topK: 8 });

    expect(chunks).toEqual([]);
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      expect.any(String),
      2,
      undefined
    );
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.FandomFfxiv,
      'nothing findable anywhere Final Fantasy XIV',
      2,
      undefined
    );
  });

  it('appends the FFXIV disambiguation boost only for the Fandom fallback, not ConsoleGamesWiki', async () => {
    const { client, resolver } = setup();
    client.search.mockImplementation((wikiId) =>
      Promise.resolve(
        wikiId === MediaWikiWikiId.ConsoleGamesWiki
          ? searchResponse([])
          : searchResponse([searchEntry({ title: 'Ninja (Final Fantasy XIV)' })])
      )
    );
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    await resolver.resolve('unlock ninja', { topK: 8 });

    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      'unlock ninja',
      2,
      undefined
    );
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.FandomFfxiv,
      'unlock ninja Final Fantasy XIV',
      2,
      undefined
    );
  });

  it('keeps chunks from other candidates when one parse() call rejects', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(
      searchResponse([searchEntry({ title: 'Broken Page' }), searchEntry({ title: 'Good Page' })])
    );
    client.parse.mockImplementation((_wikiId, params) => {
      const page = (params as { page: string }).page;
      return page === 'Broken Page'
        ? Promise.reject(new Error('page deleted'))
        : Promise.resolve(mediaWikiParseResponseWithInfoboxFixture);
    });

    const chunks = await resolver.resolve('unlock something', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceName).toBe('Good Page');
  });

  it('only parses the first MAX_PAGES_TO_PARSE (2) search hits', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(
      searchResponse([
        searchEntry({ title: 'Page 1' }),
        searchEntry({ title: 'Page 2' }),
        searchEntry({ title: 'Page 3' }),
        searchEntry({ title: 'Page 4' }),
        searchEntry({ title: 'Page 5' }),
      ])
    );
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    await resolver.resolve('unlock something popular', { topK: 8 });

    expect(client.parse).toHaveBeenCalledTimes(2);
  });

  it('falls back to Fandom when the ConsoleGamesWiki search call itself throws', async () => {
    const { client, resolver } = setup();
    client.search.mockImplementation((wikiId) =>
      wikiId === MediaWikiWikiId.ConsoleGamesWiki
        ? Promise.reject(new Error('network error'))
        : Promise.resolve(searchResponse([searchEntry({ title: 'Fandom Recovery Page' })]))
    );
    client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

    const chunks = await resolver.resolve('unlock during an outage', { topK: 8 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceName).toBe('Fandom Recovery Page');
  });

  it('defaults the search limit when options.topK is not provided', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));

    await resolver.resolve('unlock without an explicit topK', {});

    // Default (DEFAULT_SEARCH_LIMIT=8) still applies internally, but the wire-level request is
    // clamped the same way an explicit topK would be -- see the two clamping tests below.
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      expect.any(String),
      2,
      undefined
    );
  });

  it('requests only MAX_PAGES_TO_PARSE search results even when topK asks for more', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));

    await resolver.resolve('unlock with a large topK', { topK: 8 });

    // Only the first 2 candidates are ever parsed, so requesting more than that from the wiki
    // would be wasted work -- the search itself should ask for at most MAX_PAGES_TO_PARSE.
    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      expect.any(String),
      2,
      undefined
    );
  });

  it('requests exactly topK search results when topK is below MAX_PAGES_TO_PARSE', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));

    await resolver.resolve('unlock with a small topK', { topK: 1 });

    expect(client.search).toHaveBeenCalledWith(
      MediaWikiWikiId.ConsoleGamesWiki,
      expect.any(String),
      1,
      undefined
    );
  });

  it('does not drop content after a self-closing <table/> tag', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([searchEntry({ title: 'Eureka Orthos' })]));
    client.parse.mockResolvedValue(mediaWikiParseResponseWithSelfClosingTableFixture);

    const chunks = await resolver.resolve('unlock Eureka Orthos', { topK: 8 });

    expect(chunks[0]?.text).toContain('Eureka Orthos is a deep dungeon accessible from Idyllshire');
    expect(chunks[0]?.text).toContain('Handful of Casualties');
  });

  it('throws SOURCE_UNAVAILABLE when every wiki attempt errors outright', async () => {
    const { client, resolver } = setup();
    client.search.mockRejectedValue(new Error('network error'));

    await expect(
      resolver.resolve('unlock during a full outage', { topK: 8 })
    ).rejects.toMatchObject({ code: ERROR_CODES.SOURCE_UNAVAILABLE });
  });

  it('does not throw SOURCE_UNAVAILABLE when wikis succeed but legitimately have no matches', async () => {
    const { client, resolver } = setup();
    client.search.mockResolvedValue(searchResponse([]));

    await expect(resolver.resolve('nothing findable anywhere', { topK: 8 })).resolves.toEqual([]);
    expect(client.search).toHaveBeenCalledTimes(2); // both wikis genuinely queried, neither errored
  });

  it('stops after the wiki in flight when the caller aborts, without trying the fallback wiki', async () => {
    const { client, resolver } = setup();
    const controller = new AbortController();
    client.search.mockImplementation((wikiId: MediaWikiWikiId) => {
      if (wikiId === MediaWikiWikiId.ConsoleGamesWiki) {
        controller.abort();
        return Promise.reject(new Error('cancelled mid-flight'));
      }
      return Promise.resolve(searchResponse([searchEntry({ title: 'Should not be reached' })]));
    });

    const chunks = await resolver.resolve('unlock something', {
      topK: 8,
      signal: controller.signal,
    });

    expect(chunks).toEqual([]);
    expect(client.search).toHaveBeenCalledTimes(1);
  });

  describe('caching', () => {
    it('serves a cache hit without querying the wiki', async () => {
      const { client, cache, resolver } = setup();
      cache.get.mockResolvedValue(
        cacheHit({
          chunks: [
            {
              text: 'Cached unlock info.',
              source: { sourceName: 'Cached Page', sourceUrl: 'https://example.com/Cached_Page' },
              score: 1,
            },
          ],
          fetchedAt: new Date().toISOString(),
        })
      );

      const chunks = await resolver.resolve('unlock the palace of the dead', { topK: 8 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.source.sourceName).toBe('Cached Page');
      expect(client.search).not.toHaveBeenCalled();
      expect(client.parse).not.toHaveBeenCalled();
    });

    it('caches a freshly fetched result for next time', async () => {
      const { client, cache, resolver } = setup();
      client.search.mockResolvedValue(searchResponse([searchEntry()]));
      client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

      await resolver.resolve('unlock the palace of the dead', { topK: 8 });

      expect(cache.set).toHaveBeenCalled();
    });

    it('uses different cache keys for the same query at different search limits', async () => {
      const { client, cache, resolver } = setup();
      client.search.mockResolvedValue(searchResponse([searchEntry()]));
      client.parse.mockResolvedValue(mediaWikiParseResponseWithInfoboxFixture);

      await resolver.resolve('unlock the palace of the dead', { topK: 1 });
      await resolver.resolve('unlock the palace of the dead', { topK: 8 });

      // topK:1 and topK:8 clamp to different effective search limits (1 vs MAX_PAGES_TO_PARSE=2),
      // so they must not collide on one cache entry -- otherwise whichever ran first would
      // silently serve its (possibly narrower) result set to the other for the full TTL.
      const keysUsed = cache.get.mock.calls.map(([key]) => key);
      expect(new Set(keysUsed).size).toBe(2);
    });

    it('marks chunks stale when re-fetch fails after the fresh TTL has elapsed', async () => {
      const staleFetchedAt = new Date(Date.now() - 60 * 60 * 60 * 1_000).toISOString(); // 60h old
      const { client, cache, resolver } = setup();
      cache.get.mockResolvedValue(
        cacheHit({
          chunks: [
            {
              text: 'Slightly stale unlock info.',
              source: { sourceName: 'Stale Page', sourceUrl: 'https://example.com/Stale_Page' },
              score: 1,
            },
          ],
          fetchedAt: staleFetchedAt,
        })
      );
      client.search.mockRejectedValue(new Error('wiki unavailable'));

      const chunks = await resolver.resolve('unlock the palace of the dead', { topK: 8 });

      expect(chunks[0]?.source.stale).toBe(true);
    });
  });
});
