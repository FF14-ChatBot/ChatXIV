import type { SourceResolver } from './types.js';
import { createStubResolver } from './resolvers/stubResolver.js';
import { wikiStubCategories } from './resolvers/xivApiResolverSupport.js';
import { UsageCategory } from '@chatxiv/cdm';

export function createDefaultKnowledgeResolvers(): readonly SourceResolver[] {
  return [createStubResolver(Object.values(UsageCategory) as UsageCategory[])];
}

/**
 * Fallback for categories no real resolver owns yet (DEV-23). SETTINGS has no good wiki match
 * (live-checked: ConsoleGamesWiki has essentially no client-UI/HUD/keybind content) and
 * PATCH_NOTES is deliberately Phase 2 (Out-of-Scope-Phase-2-Expansion.md) -- everything else
 * MediaWikiResolver doesn't yet cover falls through here too, so this stays generic rather than
 * hardcoding those two.
 */
export function createWikiStubResolver(
  alreadyCoveredElsewhere: readonly UsageCategory[] = []
): SourceResolver {
  return createStubResolver(wikiStubCategories(alreadyCoveredElsewhere));
}
