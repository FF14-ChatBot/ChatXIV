import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createCuratedDataResolver } from '@src/lib/knowledge/resolvers/curatedDataResolver.js';
import {
  CURRENT_PATCH,
  type CuratedBisLinkEntry,
} from '@src/lib/knowledge/curated/curatedBisLinks.js';

const unpopulatedReaper: CuratedBisLinkEntry = {
  job: 'Reaper',
  jobAliases: ['rpr', 'reaper'],
  populated: false,
};

const currentPatchWhiteMage: CuratedBisLinkEntry = {
  job: 'White Mage',
  jobAliases: ['whm', 'white mage'],
  populated: true,
  content: 'current Savage raid tier',
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com/white-mage-bis',
  patch: CURRENT_PATCH,
  lastUpdated: '2026-08-03',
};

const stalePatchSage: CuratedBisLinkEntry = {
  job: 'Sage',
  jobAliases: ['sge', 'sage'],
  populated: true,
  content: 'current Savage raid tier',
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com/sage-bis',
  patch: '7.0',
  lastUpdated: '2026-01-01',
};

const fixtureEntries = [unpopulatedReaper, currentPatchWhiteMage, stalePatchSage];

describe('lib/knowledge/resolvers/curatedDataResolver', () => {
  it('exposes BIS, CRAFTING, and GATHERING as its supported categories', () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    expect(resolver.supportedCategories).toEqual([
      UsageCategory.BIS,
      UsageCategory.CRAFTING,
      UsageCategory.GATHERING,
    ]);
  });

  it('matches a profession under its own classified category (GATHERING, not BIS)', async () => {
    const miner: CuratedBisLinkEntry = {
      job: 'Miner',
      jobAliases: ['min', 'miner'],
      populated: false,
    };
    const resolver = createCuratedDataResolver([miner]);

    const chunks = await resolver.resolve('what is bis for my miner', {
      category: UsageCategory.GATHERING,
    });
    expect(chunks).toHaveLength(1);
  });

  it('declines without matching when options.category is a category it does not support', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('what is bis for white mage', {
      category: UsageCategory.UNLOCKS,
    });
    expect(chunks).toEqual([]);
  });

  it('matches when options.category is BIS or unset (fanned out)', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const withCategory = await resolver.resolve('bis for whm', { category: UsageCategory.BIS });
    const withoutCategory = await resolver.resolve('bis for whm', {});
    expect(withCategory).toHaveLength(1);
    expect(withoutCategory).toHaveLength(1);
  });

  it('returns an empty array for an empty or whitespace-only query', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    expect(await resolver.resolve('   ', { category: UsageCategory.BIS })).toEqual([]);
  });

  it('returns no chunks when no configured job matches', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('what is bis for astrologian', {
      category: UsageCategory.BIS,
    });
    expect(chunks).toEqual([]);
  });

  describe('unpopulated entries', () => {
    it('reports honestly instead of citing a fake source', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('what is bis for rpr', { category: UsageCategory.BIS });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text).toContain('No curated Best-in-Slot link has been set up yet');
      expect(chunks[0]?.text).toContain('Reaper');
      expect(chunks[0]?.source.sourceName).toBe('Not yet configured');
      expect(chunks[0]?.source.sourceUrl).toBeUndefined();
    });
  });

  describe('populated entries', () => {
    it('cites the real source and does not flag current-patch entries as stale', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('white mage bis', { category: UsageCategory.BIS });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.source.sourceUrl).toBe('https://example.com/white-mage-bis');
      expect(chunks[0]?.source.patchOrDate).toBe(CURRENT_PATCH);
      expect(chunks[0]?.source.stale).toBeUndefined();
    });

    it('flags entries whose confirmed patch is behind CURRENT_PATCH as stale', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('sage bis', { category: UsageCategory.BIS });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.source.stale).toBe(true);
      expect(chunks[0]?.text).toContain('last confirmed for patch 7.0');
      expect(chunks[0]?.text).toContain(CURRENT_PATCH);
    });
  });

  it('prefers options.entities.jobName over query text when provided', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('gear check', {
      category: UsageCategory.BIS,
      entities: { jobName: 'White Mage' },
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.source.sourceUrl).toBe('https://example.com/white-mage-bis');
  });

  it('respects topK when multiple jobs are mentioned', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('white mage and sage bis', {
      category: UsageCategory.BIS,
      topK: 1,
    });
    expect(chunks).toHaveLength(1);
  });

  it('defaults to the real shared CURATED_BIS_LINKS data when constructed with no arguments', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('reaper bis', { category: UsageCategory.BIS });
    expect(chunks).toHaveLength(1);
  });
});
