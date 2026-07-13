import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMediaWikiClient, type MediaWikiClientConfig } from '@src/lib/mediawiki/client.js';
import { MediaWikiWikiId } from '@src/lib/config/constants.js';
import { requestContext } from '@src/lib/request/requestContext.js';
import type { MediaWikiRateLimiter } from '@src/lib/mediawiki/rateLimit.js';
import type { TokenBucket } from '@src/lib/http/tokenBucket.js';
import type pino from 'pino';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

function createMockRateLimiter(): { limiter: MediaWikiRateLimiter; bucket: TokenBucket } {
  const bucket: TokenBucket = { consume: vi.fn().mockResolvedValue(undefined) };
  return { limiter: { forWiki: vi.fn().mockReturnValue(bucket) }, bucket };
}

const defaultConfig: MediaWikiClientConfig = {
  baseUrls: {
    [MediaWikiWikiId.ConsoleGamesWiki]: 'https://ffxiv.consolegameswiki.com/mediawiki/api.php',
    [MediaWikiWikiId.FandomFfxiv]: 'https://finalfantasy.fandom.com/api.php',
  },
  timeoutMs: 5_000,
  userAgent: 'ChatXIV/1.0 (test@example.com)',
};

describe('lib/mediawiki/client', () => {
  const fetchMock = vi.fn();
  let log: pino.Logger;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    log = createMockLogger();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okJson(body: unknown): Partial<Response> {
    return { ok: true, status: 200, json: () => Promise.resolve(body) } as Partial<Response>;
  }

  // ── URL construction ──────────────────────────────────────────────

  describe('query', () => {
    it('builds a query URL for the given wiki with action, format, and params', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      const result = await client.query(MediaWikiWikiId.ConsoleGamesWiki, {
        titles: 'Potion',
        prop: 'revisions',
      });

      expect(result).toEqual({ query: {} });
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.origin + url.pathname).toBe(
        'https://ffxiv.consolegameswiki.com/mediawiki/api.php'
      );
      expect(url.searchParams.get('action')).toBe('query');
      expect(url.searchParams.get('format')).toBe('json');
      expect(url.searchParams.get('titles')).toBe('Potion');
      expect(url.searchParams.get('prop')).toBe('revisions');
    });

    it('routes to the correct base URL per wikiId', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.query(MediaWikiWikiId.FandomFfxiv, {});

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.origin + url.pathname).toBe('https://finalfantasy.fandom.com/api.php');
    });

    it('does not let caller-supplied params override action or format', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.query(MediaWikiWikiId.ConsoleGamesWiki, {
        action: 'purge',
        format: 'xml',
        titles: 'Potion',
      });

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('action')).toBe('query');
      expect(url.searchParams.get('format')).toBe('json');
      expect(url.searchParams.get('titles')).toBe('Potion');
    });
  });

  describe('parse', () => {
    it('builds a parse URL with action=parse', async () => {
      fetchMock.mockResolvedValue(okJson({ parse: { title: 'Potion' } }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      const result = await client.parse(MediaWikiWikiId.ConsoleGamesWiki, { page: 'Potion' });

      expect(result).toEqual({ parse: { title: 'Potion' } });
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('action')).toBe('parse');
      expect(url.searchParams.get('page')).toBe('Potion');
    });
  });

  describe('search', () => {
    it('builds a list=search URL with srsearch', async () => {
      const body = {
        query: {
          search: [
            {
              ns: 0,
              title: 'Potion',
              pageid: 1,
              size: 10,
              wordcount: 5,
              snippet: 's',
              timestamp: 't',
            },
          ],
        },
      };
      fetchMock.mockResolvedValue(okJson(body));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      const result = await client.search(MediaWikiWikiId.ConsoleGamesWiki, 'Potion');

      expect(result).toEqual(body);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('action')).toBe('query');
      expect(url.searchParams.get('list')).toBe('search');
      expect(url.searchParams.get('srsearch')).toBe('Potion');
      expect(url.searchParams.has('srlimit')).toBe(false);
    });

    it('passes srlimit when a limit is provided', async () => {
      fetchMock.mockResolvedValue(okJson({ query: { search: [] } }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.search(MediaWikiWikiId.ConsoleGamesWiki, 'Potion', 5);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('srlimit')).toBe('5');
    });
  });

  // ── User-Agent ─────────────────────────────────────────────────────

  describe('User-Agent', () => {
    it('sends the configured User-Agent header on every request', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.query(MediaWikiWikiId.ConsoleGamesWiki, {});

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)['User-Agent']).toBe(
        'ChatXIV/1.0 (test@example.com)'
      );
    });
  });

  // ── Per-wiki throttle ──────────────────────────────────────────────

  describe('per-wiki throttling', () => {
    it('consumes a token from the bucket for the requested wiki before fetching', async () => {
      const order: string[] = [];
      const { limiter, bucket } = createMockRateLimiter();
      vi.mocked(bucket.consume).mockImplementation(() => {
        order.push('throttle');
        return Promise.resolve();
      });
      fetchMock.mockImplementation(() => {
        order.push('fetch');
        return Promise.resolve(okJson({ query: {} }));
      });

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.query(MediaWikiWikiId.ConsoleGamesWiki, {});

      expect(order).toEqual(['throttle', 'fetch']);
      expect(limiter.forWiki).toHaveBeenCalledWith(MediaWikiWikiId.ConsoleGamesWiki);
    });

    it('selects the bucket matching the wiki actually being queried', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await client.query(MediaWikiWikiId.FandomFfxiv, {});

      expect(limiter.forWiki).toHaveBeenCalledWith(MediaWikiWikiId.FandomFfxiv);
    });

    it('still throttles when a configured base URL is not already in canonical URL form', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter } = createMockRateLimiter();

      const config: MediaWikiClientConfig = {
        ...defaultConfig,
        baseUrls: {
          // Mixed case + explicit default port: differs from `new URL(...).toString()`'s output.
          [MediaWikiWikiId.ConsoleGamesWiki]:
            'https://FFXIV.consolegameswiki.com:443/mediawiki/api.php',
          [MediaWikiWikiId.FandomFfxiv]: 'https://finalfantasy.fandom.com/api.php',
        },
      };

      const client = createMediaWikiClient(config, limiter, log);
      await client.query(MediaWikiWikiId.ConsoleGamesWiki, {});

      expect(limiter.forWiki).toHaveBeenCalledWith(MediaWikiWikiId.ConsoleGamesWiki);
    });

    it('forwards requestId into throttle.consume when requestContext is active', async () => {
      fetchMock.mockResolvedValue(okJson({ query: {} }));
      const { limiter, bucket } = createMockRateLimiter();

      const client = createMediaWikiClient(defaultConfig, limiter, log);
      await requestContext.run({ requestId: 'wiki-req-1' }, () =>
        client.query(MediaWikiWikiId.ConsoleGamesWiki, {})
      );

      expect(bucket.consume).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'wiki-req-1' })
      );
    });
  });
});
