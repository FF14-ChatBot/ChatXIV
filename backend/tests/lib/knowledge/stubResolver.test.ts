import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { createStubResolver } from '@src/lib/knowledge/resolvers/stubResolver.js';

describe('createStubResolver', () => {
  it('returns empty chunks for supported categories', async () => {
    const resolver = createStubResolver([UsageCategory.RAIDING]);
    expect(resolver.supportedCategories).toEqual([UsageCategory.RAIDING]);
    const chunks = await resolver.resolve('any query', { topK: 8 });
    expect(chunks).toEqual([]);
  });
});
