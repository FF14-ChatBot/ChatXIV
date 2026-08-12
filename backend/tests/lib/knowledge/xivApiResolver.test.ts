import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { createXivApiResolver } from '@src/lib/knowledge/resolvers/xivApiResolver.js';
import { cacheHit, cacheMiss } from '@src/lib/cache/cacheGetResult.js';
import { createMockCacheClient } from '@test/mocks/cacheClient.mock.js';
import { cacheBackendHealth } from '@src/lib/cache/cacheBackendHealth.js';
import { AppError } from '@src/lib/errors/AppError.js';
import type { XivApiClient } from '@src/lib/xivapi/types.js';

describe('createXivApiResolver', () => {
  const search = vi.fn();
  const client = { search } as unknown as XivApiClient;
  let cache = createMockCacheClient();

  beforeEach(() => {
    cacheBackendHealth.configure('memory');
    cache = createMockCacheClient();
    search.mockReset();
  });

  it('returns empty chunks for blank queries', async () => {
    const resolver = createXivApiResolver({ client, cache });
    await expect(resolver.resolve('   ', {})).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('uses cache on hit', async () => {
    cache.get.mockResolvedValue(
      cacheHit({
        data: {
          results: [
            {
              score: 1,
              sheet: 'Item',
              row_id: 1,
              fields: { Name: 'Potion' },
            },
          ],
          schema: 's',
          version: 'v1',
        },
        sourceName: 'XIVAPI',
        fetchedAt: new Date().toISOString(),
      })
    );

    const resolver = createXivApiResolver({ client, cache });
    const chunks = await resolver.resolve('potion', { language: 'en', topK: 4 });

    expect(chunks).toHaveLength(1);
    expect(search).not.toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledOnce();
  });

  it('searches XIVAPI and caches on miss', async () => {
    cache.get.mockResolvedValue(cacheMiss());
    search.mockResolvedValue({
      results: [
        {
          score: 2,
          sheet: 'Item',
          row_id: 99,
          fields: { Name: 'Hi-Potion' },
        },
      ],
      schema: 's',
      version: 'v2',
    });

    const resolver = createXivApiResolver({ client, cache });
    const chunks = await resolver.resolve('hi-potion', { language: 'en', topK: 3 });

    expect(search).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();
    expect(chunks[0]?.text).toContain('Hi-Potion');
  });

  it('threads options.signal through to the XIVAPI client so retrieval-timeout cancellation actually cancels the outbound call', async () => {
    cache.get.mockResolvedValue(cacheMiss());
    search.mockResolvedValue({ results: [], schema: 's', version: 'v1' });
    const controller = new AbortController();

    const resolver = createXivApiResolver({ client, cache });
    await resolver.resolve('potion', { signal: controller.signal });

    expect(search).toHaveBeenCalledWith(expect.anything(), {
      signal: controller.signal,
      onQueueWait: undefined,
    });
  });

  it('threads options.onQueueWait through to the XIVAPI client (DEV-59)', async () => {
    cache.get.mockResolvedValue(cacheMiss());
    search.mockResolvedValue({ results: [], schema: 's', version: 'v1' });
    const onQueueWait = vi.fn();

    const resolver = createXivApiResolver({ client, cache });
    await resolver.resolve('potion', { onQueueWait });

    expect(search).toHaveBeenCalledWith(expect.anything(), { signal: undefined, onQueueWait });
  });

  it('marks chunks stale when upstream fails after soft expiry', async () => {
    const staleFetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();
    cache.get.mockResolvedValue(
      cacheHit({
        data: {
          results: [
            {
              score: 1,
              sheet: 'Item',
              row_id: 1,
              fields: { Name: 'Potion' },
            },
          ],
          schema: 's',
          version: 'v1',
        },
        sourceName: 'XIVAPI',
        fetchedAt: staleFetchedAt,
      })
    );
    search.mockRejectedValue(new Error('XIVAPI unavailable'));

    const resolver = createXivApiResolver({ client, cache });
    const chunks = await resolver.resolve('potion', {});

    expect(chunks[0]?.source.stale).toBe(true);
    expect(search).toHaveBeenCalledOnce();
  });

  it('declares XIVAPI-backed usage categories', () => {
    const resolver = createXivApiResolver({ client, cache });
    expect(resolver.supportedCategories).toContain(UsageCategory.ITEMS);
    expect(resolver.supportedCategories).toContain(UsageCategory.MSQ);
  });

  it('surfaces upstream failures as SOURCE_UNAVAILABLE', async () => {
    cache.get.mockResolvedValue(cacheMiss());
    search.mockRejectedValue(new Error('XIVAPI unavailable'));

    const resolver = createXivApiResolver({ client, cache });
    await expect(resolver.resolve('potion', {})).rejects.toMatchObject({
      status: 503,
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('preserves AppError from upstream client', async () => {
    cache.get.mockResolvedValue(cacheMiss());
    search.mockRejectedValue(AppError.sourceUnavailable('XIVAPI timeout'));

    const resolver = createXivApiResolver({ client, cache });
    await expect(resolver.resolve('potion', {})).rejects.toMatchObject({
      message: 'XIVAPI timeout',
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('includes optional attribution fields on cached hits', async () => {
    cache.get.mockResolvedValue(
      cacheHit({
        data: {
          results: [{ score: 1, sheet: 'Item', row_id: 1, fields: { Name: 'Potion' } }],
          schema: 's',
          version: 'v1',
        },
        sourceName: 'XIVAPI',
        sourceUrl: 'https://v2.xivapi.com/',
        patchOrDate: '2025.01.01',
        lastUpdated: '2025-01-01',
        fetchedAt: new Date().toISOString(),
      })
    );

    const resolver = createXivApiResolver({ client, cache });
    const chunks = await resolver.resolve('potion', {});

    expect(chunks[0]?.source).toMatchObject({
      sourceName: 'XIVAPI',
      sourceUrl: 'https://v2.xivapi.com/',
      patchOrDate: 'v1',
      lastUpdated: '2025-01-01',
    });
    expect(chunks[0]?.source.stale).toBeUndefined();
  });
});
