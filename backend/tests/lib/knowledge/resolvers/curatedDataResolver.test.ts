import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createCuratedDataResolver } from '@src/lib/knowledge/resolvers/curatedDataResolver.js';

describe('lib/knowledge/resolvers/curatedDataResolver', () => {
  it('exposes BIS as its supported category', () => {
    const resolver = createCuratedDataResolver();
    expect(resolver.supportedCategories).toEqual([UsageCategory.BIS]);
  });

  it('declines without matching when options.category is a category it does not support', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('what is bis for reaper', {
      category: UsageCategory.UNLOCKS,
    });
    expect(chunks).toEqual([]);
  });

  it('matches when options.category is BIS or unset (fanned out)', async () => {
    const resolver = createCuratedDataResolver();
    const withCategory = await resolver.resolve('bis for rpr', { category: UsageCategory.BIS });
    const withoutCategory = await resolver.resolve('bis for rpr', {});
    expect(withCategory).toHaveLength(1);
    expect(withoutCategory).toHaveLength(1);
  });

  it('returns an empty array for an empty or whitespace-only query', async () => {
    const resolver = createCuratedDataResolver();
    expect(await resolver.resolve('   ', { category: UsageCategory.BIS })).toEqual([]);
  });

  it('matches a job by abbreviation in free text and returns a link-bearing chunk', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('what is bis for rpr', { category: UsageCategory.BIS });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceUrl).toContain('reaper');
    expect(chunks[0]?.text).toContain('Reaper');
  });

  it('matches case-insensitively on the full job name', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('WHITE MAGE bis please', { category: UsageCategory.BIS });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceUrl).toContain('white-mage');
  });

  it('prefers options.entities.jobName over query text when provided', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('gear check', {
      category: UsageCategory.BIS,
      entities: { jobName: 'Reaper' },
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceUrl).toContain('reaper');
  });

  it('returns no chunks when no configured job matches', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('what is bis for astrologian', {
      category: UsageCategory.BIS,
    });
    expect(chunks).toEqual([]);
  });

  it('respects topK when multiple jobs are mentioned', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('reaper and white mage bis', {
      category: UsageCategory.BIS,
      topK: 1,
    });
    expect(chunks).toHaveLength(1);
  });

  it('every chunk carries a source citation with a URL and lastUpdated date', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('reaper and white mage bis', {
      category: UsageCategory.BIS,
    });

    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect(chunk.source.sourceUrl).toBeDefined();
      expect(chunk.source.lastUpdated).toBeDefined();
    }
  });
});
