import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createKeywordClassifier } from '@src/lib/classification/keywordClassifier.js';

describe('createKeywordClassifier', () => {
  const classifier = createKeywordClassifier();

  it('classifies raid-related text as RAIDING', async () => {
    const r = await classifier.classify('P8S mechanics');
    expect(r.category).toBe(UsageCategory.RAIDING);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('classifies gatherer terms as GATHERING', async () => {
    const r = await classifier.classify('timed nodes for miner');
    expect(r.category).toBe(UsageCategory.GATHERING);
  });

  it('classifies craft terms as CRAFTING', async () => {
    const r = await classifier.classify('firmament crafting');
    expect(r.category).toBe(UsageCategory.CRAFTING);
  });

  it('returns UNCATEGORIZED when no rule matches', async () => {
    const r = await classifier.classify('abcdefghijklmnopqrstuvwxyz');
    expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
    expect(r.confidence).toBe(0);
  });

  it('prefers craft/gather bis rules over generic BIS', async () => {
    const craftBis = await classifier.classify('crafting bis melds');
    expect(craftBis.category).toBe(UsageCategory.CRAFTING);
    const gatherBis = await classifier.classify('gathering bis gear');
    expect(gatherBis.category).toBe(UsageCategory.GATHERING);
  });
});
