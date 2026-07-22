import type { SourceResolver } from './types.js';
import { createStubResolver } from './resolvers/stubResolver.js';
import { wikiStubCategories } from './resolvers/xivApiResolverSupport.js';
import { UsageCategory } from '@chatxiv/cdm';

// TODO(DEV-23): Replace wiki stub with MediaWiki resolver + getOrFetch (Cache-Layer-Per-Category.md §7).

export function createDefaultKnowledgeResolvers(): readonly SourceResolver[] {
  return [createStubResolver(Object.values(UsageCategory) as UsageCategory[])];
}

/** TODO(DEV-23): Remove once MediaWiki resolver owns these categories. */
export function createWikiStubResolver(): SourceResolver {
  return createStubResolver(wikiStubCategories());
}
