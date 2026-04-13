import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createStubUsageRoutingModel } from '@src/lib/classification/stubUsageRoutingModel.js';

describe('createStubUsageRoutingModel', () => {
  it('always returns UNCATEGORIZED', async () => {
    const m = createStubUsageRoutingModel();
    const r = await m.classifyForRouting('any message', 'en');
    expect(r).toEqual({ category: UsageCategory.UNCATEGORIZED, confidence: 0 });
  });
});
