import type { UsageCategory } from '@chatxiv/cdm';
import type { SourceResolver, RetrievedChunk } from '../types.js';

/**
 * Stub resolver that returns no chunks for any category.
 * Used as the default until real resolvers (XivApi, MediaWiki, Curated) are implemented.
 * When all resolvers return empty, the LLM produces "I couldn't find a sourced answer."
 */
export function createStubResolver(categories: readonly UsageCategory[]): SourceResolver {
  return {
    supportedCategories: categories,
    async resolve(): Promise<readonly RetrievedChunk[]> {
      return [];
    },
  };
}
