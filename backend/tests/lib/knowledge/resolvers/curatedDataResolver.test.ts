import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createCuratedDataResolver } from '@src/lib/knowledge/resolvers/curatedDataResolver.js';
import {
  BisContentType,
  CURATED_BIS_LINKS,
  CURRENT_PATCH,
  type CuratedBisLinkEntry,
} from '@src/lib/knowledge/curated/curatedBisLinks.js';

const unpopulatedReaperSavage: CuratedBisLinkEntry = {
  job: 'Reaper',
  jobAliases: ['rpr'],
  contentType: BisContentType.SAVAGE,
  populated: false,
};

const reaperExtreme: CuratedBisLinkEntry = {
  job: 'Reaper',
  jobAliases: ['rpr'],
  contentType: BisContentType.EXTREME,
  populated: true,
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com/reaper-extreme-bis',
  patch: CURRENT_PATCH,
  lastUpdated: '2026-08-03',
};

const currentPatchWhiteMage: CuratedBisLinkEntry = {
  job: 'White Mage',
  jobAliases: ['whm'],
  contentType: BisContentType.SAVAGE,
  populated: true,
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com/white-mage-bis',
  patch: CURRENT_PATCH,
  lastUpdated: '2026-08-03',
};

const stalePatchSage: CuratedBisLinkEntry = {
  job: 'Sage',
  jobAliases: ['sge'],
  contentType: BisContentType.SAVAGE,
  populated: true,
  sourceName: 'Test Source',
  sourceUrl: 'https://example.com/sage-bis',
  patch: '7.0',
  lastUpdated: '2026-01-01',
};

const armorer: CuratedBisLinkEntry = {
  job: 'Armorer',
  jobAliases: ['arm'],
  contentType: BisContentType.CRAFTING_GEAR,
  populated: false,
};

const astrologian: CuratedBisLinkEntry = {
  job: 'Astrologian',
  jobAliases: ['ast'],
  contentType: BisContentType.SAVAGE,
  populated: false,
};

const fixtureEntries = [
  unpopulatedReaperSavage,
  reaperExtreme,
  currentPatchWhiteMage,
  stalePatchSage,
  armorer,
  astrologian,
];

describe('lib/knowledge/resolvers/curatedDataResolver', () => {
  it('exposes BIS, CRAFTING, and GATHERING as its supported categories', () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    expect(resolver.supportedCategories).toEqual([
      UsageCategory.BIS,
      UsageCategory.CRAFTING,
      UsageCategory.GATHERING,
    ]);
  });

  it('declines without matching when options.category is a category it does not support', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('what is bis for white mage', {
      category: UsageCategory.UNLOCKS,
    });
    expect(chunks).toEqual([]);
  });

  it('matches a profession under its own classified category (GATHERING, not BIS)', async () => {
    const miner: CuratedBisLinkEntry = {
      job: 'Miner',
      jobAliases: ['min'],
      contentType: BisContentType.GATHERING_GEAR,
      populated: false,
    };
    const resolver = createCuratedDataResolver([miner]);

    const chunks = await resolver.resolve('what is bis for my miner', {
      category: UsageCategory.GATHERING,
    });
    expect(chunks).toHaveLength(1);
  });

  it('returns an empty array for an empty or whitespace-only query', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    expect(await resolver.resolve('   ', { category: UsageCategory.BIS })).toEqual([]);
  });

  it('returns no chunks when no configured job matches', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('what is bis for dancer', {
      category: UsageCategory.BIS,
    });
    expect(chunks).toEqual([]);
  });

  describe('word-boundary matching (regression: short aliases must not match inside other words)', () => {
    it('does not match Armorer\'s "arm" alias inside an unrelated word like "farm"', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('how do I farm gil for crafting mats', {
        category: UsageCategory.CRAFTING,
      });
      expect(chunks).toEqual([]);
    });

    it('does not match Astrologian\'s "ast" alias inside "fastest"', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('what is the fastest way to level', {
        category: UsageCategory.BIS,
      });
      expect(chunks).toEqual([]);
    });

    it('still matches a standalone short alias on its own', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('bis for arm', { category: UsageCategory.CRAFTING });
      expect(chunks).toHaveLength(1);
    });

    it('matches a multi-word job name with no space between the words', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('whitemage bis', { category: UsageCategory.BIS });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text).toContain('White Mage');
    });

    it('matches the canonical job name even when not repeated in jobAliases', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('what is bis for reaper', {
        category: UsageCategory.BIS,
      });
      // Reaper has two content-type entries (Savage + Extreme); both should match on the bare
      // job name since neither jobAliases list repeats "reaper" -- only "rpr" is listed.
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('content-type filtering', () => {
    it('returns every content type for a job when the query names none', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('bis for rpr', { category: UsageCategory.BIS });
      expect(chunks).toHaveLength(2);
    });

    it('filters to the requested content type when the job has one', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('extreme bis for rpr', { category: UsageCategory.BIS });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text).toContain('Extreme');
    });

    it('falls back to whatever content types exist when the requested one is unavailable', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('ultimate bis for rpr', {
        category: UsageCategory.BIS,
      });
      expect(chunks).toHaveLength(2);
    });
  });

  describe('unpopulated entries', () => {
    it('reports honestly instead of citing a fake source', async () => {
      const resolver = createCuratedDataResolver(fixtureEntries);
      const chunks = await resolver.resolve('savage bis for rpr', { category: UsageCategory.BIS });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text).toContain('No curated Best-in-Slot source is currently configured');
      expect(chunks[0]?.text).toContain('Reaper');
      expect(chunks[0]?.source.sourceName).toContain('Not yet configured');
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
      expect(chunks[0]?.text).toContain('Last confirmed for patch 7.0');
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

  it('respects a caller-supplied topK', async () => {
    const resolver = createCuratedDataResolver(fixtureEntries);
    const chunks = await resolver.resolve('reaper bis', { category: UsageCategory.BIS, topK: 1 });
    expect(chunks).toHaveLength(1);
  });

  it('applies a default cap when the caller supplies no topK', async () => {
    const manyEntries: CuratedBisLinkEntry[] = Array.from({ length: 10 }, (_, i) => ({
      job: `Test Job ${i}`,
      jobAliases: [`testjob${i}`],
      contentType: BisContentType.SAVAGE,
      populated: false,
    }));
    const resolver = createCuratedDataResolver(manyEntries);
    // A single query mentioning every fixture job's alias, so all 10 entries match on the job
    // check -- with no topK passed, the resolver's own default cap (5) should still apply.
    const queryMentioningAllJobs = manyEntries.map((entry) => entry.jobAliases[0]).join(' ');
    const chunks = await resolver.resolve(queryMentioningAllJobs, { category: UsageCategory.BIS });
    expect(chunks.length).toBeLessThanOrEqual(5);
  });

  it('defaults to the real shared CURATED_BIS_LINKS data when constructed with no arguments', async () => {
    const resolver = createCuratedDataResolver();
    const chunks = await resolver.resolve('reaper bis', { category: UsageCategory.BIS });
    expect(chunks.length).toBeGreaterThan(0);
  });

  describe('every real CURATED_BIS_LINKS alias resolves to exactly its own job (regression)', () => {
    for (const entry of CURATED_BIS_LINKS) {
      for (const alias of entry.jobAliases) {
        it(`"${alias}" -> ${entry.job} (${entry.contentType})`, async () => {
          const resolver = createCuratedDataResolver(CURATED_BIS_LINKS);
          const chunks = await resolver.resolve(alias, { category: UsageCategory.BIS });

          expect(chunks.length).toBeGreaterThan(0);
          for (const chunk of chunks) {
            expect(chunk.text).toContain(entry.job);
          }
        });
      }
    }
  });
});
