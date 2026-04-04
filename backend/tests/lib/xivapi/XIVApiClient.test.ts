import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createXivApiClient, type XivApiClientConfig } from '@src/lib/xivapi/XIVApiClient.js';
import type { TokenBucket } from '@src/lib/xivapi/throttle.js';
import type pino from 'pino';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

function createMockThrottle(): TokenBucket {
  return { consume: vi.fn().mockResolvedValue(undefined) };
}

const defaultConfig: XivApiClientConfig = {
  baseUrl: 'https://v2.xivapi.com/api',
  timeoutMs: 5_000,
};

describe('lib/xivapi/XIVApiClient', () => {
  const fetchMock = vi.fn();
  let log: pino.Logger;
  let throttle: TokenBucket;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    log = createMockLogger();
    throttle = createMockThrottle();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okJson(body: unknown): Partial<Response> {
    return { ok: true, status: 200, json: () => Promise.resolve(body) } as Partial<Response>;
  }

  // ── search URL building ───────────────────────────────────────────

  describe('search', () => {
    it('builds URL with v2 search params', async () => {
      const body = { next: undefined, results: [], schema: 's', version: 'v' };
      fetchMock.mockResolvedValue(okJson(body));

      const client = createXivApiClient(defaultConfig, throttle, log);
      const result = await client.search({
        query: 'Name~"Potion"',
        sheets: 'Item',
        limit: 10,
        language: 'ja',
        fields: 'Name,Icon',
        transient: 'Description',
      });

      expect(result).toEqual(body);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/search');
      expect(url.searchParams.get('query')).toBe('Name~"Potion"');
      expect(url.searchParams.get('sheets')).toBe('Item');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('language')).toBe('ja');
      expect(url.searchParams.get('fields')).toBe('Name,Icon');
      expect(url.searchParams.get('transient')).toBe('Description');
    });

    it('builds cursor-based pagination URL', async () => {
      fetchMock.mockResolvedValue(okJson({ results: [], schema: 's', version: 'v' }));

      const cursor = 'bbe61a5e-7d22-41ec-9f5a-711c967c5624';
      const client = createXivApiClient(defaultConfig, throttle, log);
      await client.search({ cursor });

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('cursor')).toBe(cursor);
    });

    it('omits optional params when not provided', async () => {
      fetchMock.mockResolvedValue(okJson({ results: [], schema: 's', version: 'v' }));

      const client = createXivApiClient(defaultConfig, throttle, log);
      await client.search({});

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/search');
      expect(url.searchParams.has('query')).toBe(false);
      expect(url.searchParams.has('sheets')).toBe(false);
      expect(url.searchParams.has('language')).toBe(false);
      expect(url.searchParams.has('cursor')).toBe(false);
    });
  });

  // ── getRow URL building ───────────────────────────────────────────

  describe('getRow', () => {
    it('builds URL with sheet name, row id, and optional params', async () => {
      const body = { row_id: 100, fields: { Name: 'Test' }, schema: 's', version: 'v' };
      fetchMock.mockResolvedValue(okJson(body));

      const client = createXivApiClient(defaultConfig, throttle, log);
      const result = await client.getRow('Quest', 100, {
        language: 'fr',
        fields: 'Name',
      });

      expect(result).toEqual(body);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/sheet/Quest/100');
      expect(url.searchParams.get('language')).toBe('fr');
      expect(url.searchParams.get('fields')).toBe('Name');
    });

    it('omits optional params when not provided', async () => {
      fetchMock.mockResolvedValue(okJson({ row_id: 1, fields: {}, schema: 's', version: 'v' }));

      const client = createXivApiClient(defaultConfig, throttle, log);
      await client.getRow('Item', 1);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/sheet/Item/1');
      expect(url.searchParams.has('language')).toBe(false);
      expect(url.searchParams.has('fields')).toBe(false);
      expect(url.searchParams.has('transient')).toBe(false);
    });

    it('encodes sheet names with special characters', async () => {
      fetchMock.mockResolvedValue(okJson({ row_id: 1, fields: {}, schema: 's', version: 'v' }));

      const client = createXivApiClient(defaultConfig, throttle, log);
      await client.getRow('GCRankGridaniaFemaleText', 1);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/sheet/GCRankGridaniaFemaleText/1');
    });
  });

  // ── Throttle delegation ───────────────────────────────────────────

  describe('throttle integration', () => {
    it('awaits throttle.consume() before each fetch', async () => {
      const order: string[] = [];
      const mockThrottle: TokenBucket = {
        consume: vi.fn().mockImplementation(() => {
          order.push('throttle');
          return Promise.resolve();
        }),
      };
      fetchMock.mockImplementation(() => {
        order.push('fetch');
        return Promise.resolve(okJson({ results: [], schema: 's', version: 'v' }));
      });

      const client = createXivApiClient(defaultConfig, mockThrottle, log);
      await client.search({});

      expect(order).toEqual(['throttle', 'fetch']);
    });
  });

  // ── Base URL trailing-slash handling ───────────────────────────────

  describe('base URL normalization', () => {
    it('works with trailing slash in base URL', async () => {
      fetchMock.mockResolvedValue(okJson({ results: [], schema: 's', version: 'v' }));

      const config: XivApiClientConfig = {
        baseUrl: 'https://v2.xivapi.com/api/',
        timeoutMs: 5_000,
      };
      const client = createXivApiClient(config, throttle, log);
      await client.search({});

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/search');
    });

    it('works without trailing slash in base URL', async () => {
      fetchMock.mockResolvedValue(okJson({ row_id: 1, fields: {}, schema: 's', version: 'v' }));

      const config: XivApiClientConfig = {
        baseUrl: 'https://v2.xivapi.com/api',
        timeoutMs: 5_000,
      };
      const client = createXivApiClient(config, throttle, log);
      await client.getRow('Item', 42);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/api/sheet/Item/42');
    });
  });
});
