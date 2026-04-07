import { describe, it, expect, vi } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { ClassificationRouting } from '@src/lib/classification/types.js';
import { createRoutingClassifier } from '@src/lib/classification/routingClassifier.js';
import type { ClassificationService, UsageRoutingModel } from '@src/lib/classification/types.js';

describe('createRoutingClassifier', () => {
  it('returns keyword result without calling routing model when category is set', async () => {
    const keyword: ClassificationService = {
      classify: vi.fn().mockResolvedValue({
        category: UsageCategory.RAIDING,
        confidence: ClassificationRouting.KeywordRuleConfidence,
      }),
    };
    const routing: UsageRoutingModel = {
      classifyForRouting: vi.fn(),
    };
    const svc = createRoutingClassifier(keyword, routing);
    const r = await svc.classify('P8S', 'en');
    expect(r.category).toBe(UsageCategory.RAIDING);
    expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    expect(routing.classifyForRouting).not.toHaveBeenCalled();
    expect(keyword.classify).toHaveBeenCalledWith('P8S', 'en');
  });

  it('calls routing model when keyword returns UNCATEGORIZED', async () => {
    const keyword: ClassificationService = {
      classify: vi.fn().mockResolvedValue({
        category: UsageCategory.UNCATEGORIZED,
        confidence: 0,
      }),
    };
    const routing: UsageRoutingModel = {
      classifyForRouting: vi
        .fn()
        .mockResolvedValue({ category: UsageCategory.MSQ, confidence: 0.9 }),
    };
    const svc = createRoutingClassifier(keyword, routing);
    const r = await svc.classify('xyz', 'ja');
    expect(r.category).toBe(UsageCategory.MSQ);
    expect(r.confidence).toBe(0.9);
    expect(routing.classifyForRouting).toHaveBeenCalledWith('xyz', 'ja');
  });

  it('ignores routing model when confidence is not above threshold', async () => {
    const keyword: ClassificationService = {
      classify: vi.fn().mockResolvedValue({
        category: UsageCategory.UNCATEGORIZED,
        confidence: 0,
      }),
    };
    const routing: UsageRoutingModel = {
      classifyForRouting: vi
        .fn()
        .mockResolvedValue({ category: UsageCategory.MSQ, confidence: 0.5 }),
    };
    const svc = createRoutingClassifier(keyword, routing);
    const r = await svc.classify('q');
    expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
    expect(r.confidence).toBe(0.5);
  });

  it('ignores routing model when it returns UNCATEGORIZED even with high confidence', async () => {
    const keyword: ClassificationService = {
      classify: vi.fn().mockResolvedValue({
        category: UsageCategory.UNCATEGORIZED,
        confidence: 0,
      }),
    };
    const routing: UsageRoutingModel = {
      classifyForRouting: vi
        .fn()
        .mockResolvedValue({ category: UsageCategory.UNCATEGORIZED, confidence: 0.99 }),
    };
    const svc = createRoutingClassifier(keyword, routing);
    const r = await svc.classify('q');
    expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
    expect(r.confidence).toBe(0.99);
  });
});
