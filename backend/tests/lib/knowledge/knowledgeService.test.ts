import { describe, it, expect, vi, afterEach } from 'vitest';
import { ERROR_CODES, UsageCategory } from '@chatxiv/cdm';
import { logger } from '@src/lib/observability/logger.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { createKnowledgeService } from '@src/lib/knowledge/knowledgeService.js';
import { rankScore } from '@src/lib/knowledge/resolverScoring.js';
import { createCuratedDataResolver } from '@src/lib/knowledge/resolvers/curatedDataResolver.js';
import { BisContentType, CURRENT_PATCH } from '@src/lib/knowledge/curated/curatedBisLinks.js';
import type { SourceResolver } from '@src/lib/knowledge/types.js';

describe('createKnowledgeService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty chunks when no resolvers are registered', async () => {
    const svc = createKnowledgeService([]);
    const result = await svc.retrieve('q');
    expect(result.chunks).toEqual([]);
  });

  it('merges and sorts chunks by score across resolvers', async () => {
    const r1: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'low', source: { sourceName: 'A' }, score: 1 }],
    };
    const r2: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'high', source: { sourceName: 'B' }, score: 10 }],
    };
    const svc = createKnowledgeService([r1, r2]);
    const result = await svc.retrieve('fight', { category: UsageCategory.RAIDING, topK: 8 });
    expect(result.chunks.map((c) => c.text)).toEqual(['high', 'low']);
  });

  it('breaks exact score ties by content length, not resolver registration order', async () => {
    // Both resolvers return their best (rank-0) result, which rank-based scoring caps at the
    // same 1.0 -- without a secondary key, `Array.sort`'s stability would let whichever resolver
    // is registered first (r1 here) win every tie regardless of which chunk is more substantive.
    const r1: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'short', source: { sourceName: 'A' }, score: 1 }],
    };
    const r2: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [
        {
          text: 'a much longer and more substantive chunk of text',
          source: { sourceName: 'B' },
          score: 1,
        },
      ],
    };
    const svc = createKnowledgeService([r1, r2]);
    const result = await svc.retrieve('fight', { category: UsageCategory.RAIDING, topK: 8 });
    expect(result.chunks[0]?.source.sourceName).toBe('B');
  });

  it('uses all resolvers when category is uncategorized', async () => {
    const r1: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'a', source: { sourceName: 'x' } }],
    };
    const r2: SourceResolver = {
      supportedCategories: [UsageCategory.MSQ],
      resolve: async () => [{ text: 'b', source: { sourceName: 'y' } }],
    };
    const svc = createKnowledgeService([r1, r2]);
    const result = await svc.retrieve('q', { category: UsageCategory.UNCATEGORIZED });
    expect(result.chunks.length).toBe(2);
  });

  it('ignores failed resolvers and keeps fulfilled results', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => {
        throw new Error('boom');
      },
    };
    const good: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'ok', source: { sourceName: 'g' } }],
    };
    const svc = createKnowledgeService([bad, good]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].text).toBe('ok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws SOURCE_UNAVAILABLE when the only resolver fails synchronously', async () => {
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: () => {
        throw AppError.sourceUnavailable('sync upstream failure');
      },
    };
    const svc = createKnowledgeService([bad]);
    await expect(svc.retrieve('q', { category: UsageCategory.RAIDING })).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
  });

  it('falls back to all resolvers when category has no dedicated mapping', async () => {
    const msqOnly: SourceResolver = {
      supportedCategories: [UsageCategory.MSQ],
      resolve: async () => [{ text: 'msq', source: { sourceName: 'm' } }],
    };
    const svc = createKnowledgeService([msqOnly]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].text).toBe('msq');
  });

  it('throws SOURCE_UNAVAILABLE when all targeted resolvers fail', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => {
        throw AppError.sourceUnavailable('XIVAPI down');
      },
    };
    const svc = createKnowledgeService([bad]);
    await expect(svc.retrieve('q', { category: UsageCategory.RAIDING })).rejects.toMatchObject({
      status: 503,
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
      message: 'XIVAPI down',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('logs aggregated resolver failures before throwing', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const badOne: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => {
        throw AppError.sourceUnavailable('XIVAPI down');
      },
    };
    const badTwo: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => {
        throw new Error('wiki exploded');
      },
    };
    const svc = createKnowledgeService([badOne, badTwo]);

    await expect(svc.retrieve('q', { category: UsageCategory.RAIDING })).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ failures: expect.arrayContaining([expect.any(Error)]) }),
      expect.stringContaining('Source resolver failed')
    );
    warn.mockRestore();
  });

  it('throws SOURCE_UNAVAILABLE when all resolvers fail for uncategorized query', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: () => {
        throw new Error('sync boom');
      },
    };
    const svc = createKnowledgeService([bad]);
    await expect(
      svc.retrieve('q', { category: UsageCategory.UNCATEGORIZED })
    ).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('merges a real CuratedDataResolver populated chunk alongside a rank-scored sibling for the same category (regression: curated chunks must not lose the merge to a score-0 default)', async () => {
    const curated = createCuratedDataResolver([
      {
        job: 'White Mage',
        jobAliases: ['whm'],
        contentType: BisContentType.SAVAGE,
        populated: true,
        sourceName: 'The Balance',
        sourceUrl: 'https://example.com/whm-bis',
        patch: CURRENT_PATCH,
        lastUpdated: '2026-08-03',
      },
    ]);
    // Shaped like XivApiResolver/MediaWikiResolver: real rank-based scores, not the hand-set
    // fixed scores the other tests in this file use, so this exercises the same scale collision
    // the real resolvers would hit in production.
    const xivApiLike: SourceResolver = {
      supportedCategories: [UsageCategory.BIS],
      resolve: async () => [
        { text: 'xivapi result 1', source: { sourceName: 'XIVAPI' }, score: rankScore(0) },
        { text: 'xivapi result 2', source: { sourceName: 'XIVAPI' }, score: rankScore(1) },
      ],
    };
    const svc = createKnowledgeService([curated, xivApiLike]);

    // topK: 2 is the crux -- before curatedDataResolver assigned real scores, its chunk defaulted
    // to 0 and was always the weakest of the three, so it fell out of the top 2 here every time.
    const result = await svc.retrieve('white mage bis', { category: UsageCategory.BIS, topK: 2 });

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks.some((c) => c.source.sourceUrl === 'https://example.com/whm-bis')).toBe(
      true
    );
  });

  it('treats missing scores as zero when sorting', async () => {
    const r: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [
        { text: 'no-score', source: { sourceName: 'a' } },
        { text: 'scored', source: { sourceName: 'b' }, score: 1 },
      ],
    };
    const svc = createKnowledgeService([r]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING, topK: 8 });
    expect(result.chunks.map((c) => c.text)).toEqual(['scored', 'no-score']);
  });

  it('throws SOURCE_UNAVAILABLE when retrieval budget aborts before resolve', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {
      /* noop */
    });
    const slow: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ text: 'late', source: { sourceName: 's' } }]), 15_000);
        }),
    };
    const svc = createKnowledgeService([slow]);
    const retrievePromise = svc.retrieve('q', { category: UsageCategory.RAIDING });
    const settled = retrievePromise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(10_001);
    await expect(retrievePromise).rejects.toMatchObject({
      code: ERROR_CODES.SOURCE_UNAVAILABLE,
    });
    await vi.runAllTimersAsync();
    await settled;
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('gives each resolver its own AbortSignal, not one shared across all of them (DEV-59)', async () => {
    const seenSignals: AbortSignal[] = [];
    const capture: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async (_query, options) => {
        if (options?.signal) seenSignals.push(options.signal);
        return [];
      },
    };
    const captureToo: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async (_query, options) => {
        if (options?.signal) seenSignals.push(options.signal);
        return [];
      },
    };
    const svc = createKnowledgeService([capture, captureToo]);
    await svc.retrieve('q', { category: UsageCategory.RAIDING });

    expect(seenSignals).toHaveLength(2);
    // Previously one AbortController was shared across the whole fan-out, so any one resolver's
    // timeout aborted every resolver's signal, not just its own. Each resolver must now get a
    // distinct signal so that guarantee holds by construction, not by coincidence of timing.
    expect(seenSignals[0]).not.toBe(seenSignals[1]);
  });

  it("preserves a healthy resolver's result even when another resolver never settles and times out", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {
      /* noop */
    });
    const hangs: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: () => new Promise(() => {}), // never settles on its own
    };
    const healthy: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'still works', source: { sourceName: 'ok' } }],
    };
    const svc = createKnowledgeService([hangs, healthy]);
    const retrievePromise = svc.retrieve('q', { category: UsageCategory.RAIDING });
    await vi.advanceTimersByTimeAsync(10_001);

    const result = await retrievePromise;
    expect(result.chunks.map((c) => c.text)).toEqual(['still works']);
    warn.mockRestore();
  });
});
