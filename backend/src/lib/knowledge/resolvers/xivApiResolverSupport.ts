import { UsageCategory } from '@chatxiv/cdm';
import type { SourceCitation } from '@chatxiv/cdm';
import type {
  XivApiLanguage,
  XivApiSearchResult,
  XivApiSearchResultEntry,
} from '../../xivapi/types.js';
import { XivApiLanguage as XivApiLanguageValues } from '../../xivapi/types.js';
import type { RetrievedChunk } from '../types.js';
import { XIVAPI_DATA_SOURCE } from '../../config/constants.js';

/** Categories served by XIVAPI search in the MVP resolver. */
// TODO(DEV-23): Reconcile with per-category sources/TTL table — some categories may move to MediaWiki-only keys.
export const XivApiResolverCategories = [
  UsageCategory.ITEMS,
  UsageCategory.CRAFTING,
  UsageCategory.GATHERING,
  UsageCategory.VENDORS,
  UsageCategory.MSQ,
  UsageCategory.UNLOCKS,
  UsageCategory.BIS,
  UsageCategory.RAIDING,
  UsageCategory.EXPLORATION,
  UsageCategory.RELIC_WEAPONS,
  UsageCategory.COLLECTIBLES,
] as const satisfies readonly UsageCategory[];

const xivApiCategorySet = new Set<UsageCategory>(XivApiResolverCategories);

export function isXivApiResolverCategory(category: UsageCategory): boolean {
  return xivApiCategorySet.has(category);
}

export function wikiStubCategories(): UsageCategory[] {
  // TODO(DEV-23): Replace stub list when MediaWiki resolver registers its own supportedCategories.
  return Object.values(UsageCategory).filter(
    (category) => category !== UsageCategory.UNCATEGORIZED && !xivApiCategorySet.has(category)
  );
}

export function mapXivApiSearchToChunks(
  searchResult: XivApiSearchResult,
  attribution: SourceCitation
): readonly RetrievedChunk[] {
  // Rank-based, not XIVAPI's raw (unbounded) relevance score: knowledgeService merges chunks
  // from multiple resolvers sharing a category (e.g. UNLOCKS, also served by MediaWikiResolver)
  // into one sorted list. XIVAPI's engine score and MediaWikiResolver's rank-based score
  // (1 / (rank + 1)) aren't on the same scale -- using the raw score here would let XIVAPI
  // results always outrank MediaWiki's regardless of actual relevance. `results` is already
  // returned in the API's own relevance order, so rank works the same way it does for MediaWiki.
  return searchResult.results.map((entry, rank) => ({
    text: formatSearchEntryText(entry),
    source: {
      ...attribution,
      patchOrDate: searchResult.version,
    },
    score: 1 / (rank + 1),
  }));
}

function formatSearchEntryText(entry: XivApiSearchResultEntry): string {
  const name = readStringField(entry.fields, 'Name');
  const description = readStringField(entry.transient ?? entry.fields, 'Description');
  const header = `[${entry.sheet} #${entry.row_id}]`;
  const parts = [header, name, description].filter(
    (part): part is string => part !== undefined && part.trim() !== ''
  );
  return parts.join('\n');
}

function readStringField(
  record: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function xivApiSearchSourceCitation(version?: string): SourceCitation {
  return {
    sourceName: XIVAPI_DATA_SOURCE,
    sourceUrl: 'https://v2.xivapi.com/',
    ...(version !== undefined ? { patchOrDate: version } : {}),
  };
}

export function normalizeXivApiLanguage(language?: string): XivApiLanguage {
  if (!language || language.trim() === '') {
    return XivApiLanguageValues.En;
  }
  const normalized = language.trim().toLowerCase();
  switch (normalized) {
    case 'ja':
      return XivApiLanguageValues.Ja;
    case 'de':
      return XivApiLanguageValues.De;
    case 'fr':
      return XivApiLanguageValues.Fr;
    case 'chs':
      return XivApiLanguageValues.Chs;
    case 'cht':
      return XivApiLanguageValues.Cht;
    case 'kr':
      return XivApiLanguageValues.Kr;
    default:
      return XivApiLanguageValues.En;
  }
}
