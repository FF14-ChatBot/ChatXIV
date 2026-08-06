import { UsageCategory } from '@chatxiv/cdm';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';
import {
  BisContentType,
  CURATED_BIS_LINKS,
  CURRENT_PATCH,
  type CuratedBisLinkEntry,
} from '../curated/curatedBisLinks.js';
import { rankScore } from '../resolverScoring.js';

// Crafting/gathering BiS queries classify as CRAFTING/GATHERING, not BIS -- the keyword
// classifier's dedicated patterns for those (e.g. "bis for miner") match before its generic BIS
// pattern ever would. XivApiResolver already listens on all three for the same reason.
const CURATED_DATA_CATEGORIES: readonly UsageCategory[] = [
  UsageCategory.BIS,
  UsageCategory.CRAFTING,
  UsageCategory.GATHERING,
];

/**
 * Caps how many chunks a single query can pull in when no caller-supplied topK is given.
 * Production traffic never hits this: knowledgeService.ts always computes a concrete topK (its
 * own DEFAULT_TOP_K) and passes it through options, so this only applies when a test calls
 * resolve() directly, bypassing knowledgeService.
 */
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
 *
 * Known limitation: word boundaries don't disambiguate a short alias from an ordinary word
 * spelled the same way -- e.g. "min" (Miner) also matches "min ilvl", "war" (Warrior) also
 * matches unrelated uses of that word. Every job alias is FFXIV's standard 3-letter code, so
 * there's no length-based cutoff that filters out the colliding ones without also breaking
 * legitimate short-alias matches (e.g. "bis for war"). See `matchesJob`'s `entityJobName`
 * parameter below -- once the classifier actually populates it, that structured signal sidesteps
 * this collision risk entirely instead of trying to patch it here.
 */
function includesPhrase(text: string, phrase: string): boolean {
  const words = phrase.trim().split(/\s+/).map(escapeRegExp);
  const pattern = new RegExp(`\\b${words.join('\\s*')}\\b`, 'i');
  return pattern.test(text);
}

/**
 * `entityJobName`, when present, is trusted over phrase-matching the raw query below --
 * currently always `undefined` in production, since nothing in the classification layer
 * populates `ExtractedEntities.jobName` yet (see `types.ts`). Once something does, this path
 * sidesteps `includesPhrase`'s alias/common-word collision risk entirely.
 */
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

/**
 * TODO: once a user-facing feedback/report mechanism exists (no `POST /v1/feedback` route yet --
 * see Feedback-API-Implementation.md), add report-this-entry language to both the "not yet
 * configured" text below and the stale-note text, so users can flag entries that are wrong,
 * missing, or out of date instead of just being told so with no way to act on it.
 */
function toChunk(entry: CuratedBisLinkEntry, rank: number): RetrievedChunk {
  if (!entry.populated) {
    return {
      text: `No curated Best-in-Slot source is currently configured for ${entry.job} (${entry.contentType}).`,
      source: {
        sourceName: `Not yet configured (${entry.job} – ${entry.contentType})`,
      },
      // Explicit 0, not just knowledgeService's `score ?? 0` fallback: an unconfigured placeholder
      // carries no real information, so it must not outrank -- or crowd out -- an actual answer
      // from another resolver sharing this category.
      score: 0,
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
    // Rank-based like XivApiResolver/MediaWikiResolver (see resolverScoring.ts) so a populated
    // curated entry -- the authoritative answer this resolver exists to surface -- competes on
    // the same scale instead of defaulting to 0 and always losing the merge to any resolver that
    // does assign a score.
    score: rankScore(rank),
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
      return matches.slice(0, topK).map((entry, rank) => toChunk(entry, rank));
    },
  };
}
