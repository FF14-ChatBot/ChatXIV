import { UsageCategory } from '@chatxiv/cdm';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';
import {
  BisContentType,
  CURATED_BIS_LINKS,
  CURRENT_PATCH,
  type CuratedBisLinkEntry,
} from '../curated/curatedBisLinks.js';

// Crafting/gathering BiS queries classify as CRAFTING/GATHERING, not BIS -- the keyword
// classifier's dedicated patterns for those (e.g. "bis for miner") match before its generic BIS
// pattern ever would. XivApiResolver already listens on all three for the same reason.
const CURATED_DATA_CATEGORIES: readonly UsageCategory[] = [
  UsageCategory.BIS,
  UsageCategory.CRAFTING,
  UsageCategory.GATHERING,
];

/** Caps how many chunks a single query can pull in when no caller-supplied topK is given. */
const CURATED_DATA_DEFAULT_TOP_K = 5;

/** Free-text words that pin a query to one specific BisContentType, checked before falling back
 *  to "return every content type this job has." */
const CONTENT_TYPE_KEYWORDS: ReadonlyMap<BisContentType, readonly string[]> = new Map([
  [BisContentType.SAVAGE, ['savage']],
  [BisContentType.EXTREME, ['extreme']],
  [BisContentType.ULTIMATE, ['ultimate']],
  [BisContentType.LEVELING, ['leveling', 'levelling']],
  [BisContentType.CRAFTING_GEAR, ['crafting gear', 'crafter gear']],
  [BisContentType.GATHERING_GEAR, ['gathering gear', 'gatherer gear']],
]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word/whole-phrase match: word-boundaries around the phrase so a short alias like "arm"
 * can't match inside "farm", and `\s*` between the phrase's own words so "white mage" also
 * matches a query spelled "whitemage" without needing a separately maintained no-space alias.
 */
function includesPhrase(text: string, phrase: string): boolean {
  const words = phrase.trim().split(/\s+/).map(escapeRegExp);
  const pattern = new RegExp(`\\b${words.join('\\s*')}\\b`, 'i');
  return pattern.test(text);
}

function matchesJob(entry: CuratedBisLinkEntry, query: string, entityJobName?: string): boolean {
  if (entityJobName !== undefined) {
    const entityLower = entityJobName.toLowerCase();
    const entityMatch =
      entry.job.toLowerCase() === entityLower ||
      entry.jobAliases.some((alias) => alias.toLowerCase() === entityLower);
    if (entityMatch) {
      return true;
    }
  }
  return (
    includesPhrase(query, entry.job) ||
    entry.jobAliases.some((alias) => includesPhrase(query, alias))
  );
}

function detectContentType(query: string): BisContentType | undefined {
  for (const [type, keywords] of CONTENT_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => includesPhrase(query, keyword))) {
      return type;
    }
  }
  return undefined;
}

function toChunk(entry: CuratedBisLinkEntry): RetrievedChunk {
  if (!entry.populated) {
    return {
      text: `No curated Best-in-Slot source is currently configured for ${entry.job} (${entry.contentType}).`,
      source: {
        sourceName: `Not yet configured (${entry.job} – ${entry.contentType})`,
      },
    };
  }

  const isStale = entry.patch !== CURRENT_PATCH;
  const staleNote = isStale
    ? ` Last confirmed for patch ${entry.patch}; the game has since moved to ${CURRENT_PATCH}, so this may be out of date until someone re-checks it.`
    : '';

  return {
    text: `${entry.job} ${entry.contentType} Best-in-Slot guidance is maintained externally by ${entry.sourceName}, not reproduced here since priorities shift with balance patches -- see the linked source.${staleNote}`,
    source: {
      sourceName: `${entry.sourceName} (${entry.job} – ${entry.contentType})`,
      sourceUrl: entry.sourceUrl,
      patchOrDate: entry.patch,
      lastUpdated: entry.lastUpdated,
      ...(isStale ? { stale: true as const } : {}),
    },
  };
}

/**
 * Third `SourceResolver` implementation alongside XivApiResolver/MediaWikiResolver (see
 * `knowledge/types.ts`), for content that has no live API and would otherwise need hand
 * maintenance -- currently just Best-in-Slot. Resolves to link-only chunks; see
 * `curatedBisLinks.ts` for why, the populated/unpopulated split, and the deferred stat-priority
 * middle ground.
 */
export function createCuratedDataResolver(
  entries: readonly CuratedBisLinkEntry[] = CURATED_BIS_LINKS
): SourceResolver {
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

      const jobMatches = entries.filter((entry) =>
        matchesJob(entry, trimmed, options?.entities?.jobName)
      );

      // If the query names a specific content type (e.g. "extreme"), prefer entries of that type
      // -- but if this job doesn't have one, fall back to whatever content types it does have
      // rather than returning nothing.
      const detectedType = detectContentType(trimmed);
      const typeFiltered =
        detectedType !== undefined
          ? jobMatches.filter((entry) => entry.contentType === detectedType)
          : jobMatches;
      const matches = typeFiltered.length > 0 ? typeFiltered : jobMatches;

      const topK = options?.topK ?? CURATED_DATA_DEFAULT_TOP_K;
      return matches.slice(0, topK).map(toChunk);
    },
  };
}
