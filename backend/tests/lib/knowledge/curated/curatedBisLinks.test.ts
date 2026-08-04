import { describe, it, expect } from 'vitest';
import { CURATED_BIS_LINKS, CURRENT_PATCH } from '@src/lib/knowledge/curated/curatedBisLinks.js';

describe('lib/knowledge/curated/curatedBisLinks', () => {
  it('has no populated entry whose confirmed patch is behind CURRENT_PATCH', () => {
    // Passes trivially while nothing is populated yet. The moment a real entry is added, and
    // later whenever CURRENT_PATCH is bumped for a new game patch without updating that entry,
    // this fails -- that's the point: bumping the patch constant is what forces a review.
    const stale = CURATED_BIS_LINKS.filter(
      (entry) => entry.populated && entry.patch !== CURRENT_PATCH
    );
    expect(stale).toEqual([]);
  });

  it('has no job alias reused by two different jobs (same job reusing its own alias across content-type rows is fine)', () => {
    const ownerByAlias = new Map<string, string>();
    for (const entry of CURATED_BIS_LINKS) {
      for (const alias of entry.jobAliases) {
        const key = alias.toLowerCase();
        const owner = ownerByAlias.get(key);
        if (owner !== undefined && owner !== entry.job) {
          throw new Error(`alias "${alias}" is claimed by both ${owner} and ${entry.job}`);
        }
        ownerByAlias.set(key, entry.job);
      }
    }
  });

  it('has no exact duplicate (job, contentType) row', () => {
    const seen = new Set<string>();
    for (const entry of CURATED_BIS_LINKS) {
      const key = `${entry.job}::${entry.contentType}`;
      expect(seen.has(key), `duplicate entry for ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
