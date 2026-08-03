import { UsageCategory } from '@chatxiv/cdm';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';
import { CURATED_BIS_LINKS, type CuratedBisLinkEntry } from '../curated/curatedBisLinks.js';

const CURATED_DATA_CATEGORIES: readonly UsageCategory[] = [UsageCategory.BIS];

function matchesJob(
  entry: CuratedBisLinkEntry,
  queryLower: string,
  entityJobName?: string
): boolean {
  if (entityJobName !== undefined) {
    const entityLower = entityJobName.toLowerCase();
    const entityMatch =
      entry.job.toLowerCase() === entityLower ||
      entry.jobAliases.some((alias) => alias.toLowerCase() === entityLower);
    if (entityMatch) {
      return true;
    }
  }
  return entry.jobAliases.some((alias) => queryLower.includes(alias.toLowerCase()));
}

function toChunk(entry: CuratedBisLinkEntry): RetrievedChunk {
  return {
    text: `${entry.job} Best-in-Slot guidance for the ${entry.content} is maintained externally by ${entry.sourceName} (see the linked source). Point the user there rather than stating a gear list, since BiS priorities shift with balance patches.`,
    source: {
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      ...(entry.patchOrDate !== undefined ? { patchOrDate: entry.patchOrDate } : {}),
      lastUpdated: entry.lastUpdated,
    },
  };
}

/**
 * Third `SourceResolver` implementation alongside XivApiResolver/MediaWikiResolver (see
 * `knowledge/types.ts`), for content that has no live API and would otherwise need hand
 * maintenance -- currently just Best-in-Slot. Resolves to link-only chunks; see
 * `curatedBisLinks.ts` for why and the deferred stat-priority middle ground.
 */
export function createCuratedDataResolver(): SourceResolver {
  return {
    supportedCategories: CURATED_DATA_CATEGORIES,
    async resolve(query: string, options?: ResolveOptions): Promise<readonly RetrievedChunk[]> {
      // Mirrors MediaWikiResolver's guard (mediaWikiResolver.ts): only do real matching when this
      // resolver actually declared the category, not for every fanned-out uncategorized query.
      if (options?.category !== undefined && !CURATED_DATA_CATEGORIES.includes(options.category)) {
        return [];
      }

      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return [];
      }

      const queryLower = trimmed.toLowerCase();
      const matches = CURATED_BIS_LINKS.filter((entry) =>
        matchesJob(entry, queryLower, options?.entities?.jobName)
      );

      const limited = options?.topK !== undefined ? matches.slice(0, options.topK) : matches;
      return limited.map(toChunk);
    },
  };
}
