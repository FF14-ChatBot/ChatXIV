import type { SourceCitation, UsageCategory } from '@chatxiv/cdm';

/** A single retrieved passage with metadata for citation. */
export interface RetrievedChunk {
  readonly text: string;
  readonly source: SourceCitation;
  readonly score?: number;
}

/** Result of the retrieval step: chunks to pass to the LLM. */
export interface RetrievalResult {
  readonly chunks: readonly RetrievedChunk[];
  readonly category?: UsageCategory;
}

export interface RetrieveOptions {
  readonly category?: UsageCategory;
  readonly language?: string;
  readonly entities?: ExtractedEntities;
  readonly topK?: number;
}

/**
 * Structured data extracted by the ClassificationService.
 * Downstream resolvers use these to build targeted API queries.
 */
export interface ExtractedEntities {
  readonly jobName?: string;
  readonly fightName?: string;
  readonly questName?: string;
  readonly expansion?: string;
  readonly raw?: Readonly<Record<string, string>>;
}

/**
 * A source resolver handles one or more usage categories.
 * The KnowledgeService routes queries to the appropriate resolver(s)
 * based on the classified category.
 *
 * Implementations: XivApiResolver, MediaWikiResolver, CuratedDataResolver.
 * New sources are added by implementing this interface and registering
 * in the DI container -- no existing code changes (OCP).
 */
export interface SourceResolver {
  readonly supportedCategories: readonly UsageCategory[];
  resolve(query: string, options: ResolveOptions): Promise<readonly RetrievedChunk[]>;
}

export interface ResolveOptions {
  /**
   * The category `retrieve()` was called with. Set even when this resolver is only running
   * because `KnowledgeService` fanned out to every resolver for an UNCATEGORIZED/unknown query --
   * resolvers that only want to act on categories they actually declare in `supportedCategories`
   * should check this and return `[]` rather than treating every fan-out call as relevant.
   */
  readonly category?: UsageCategory;
  readonly language?: string;
  readonly entities?: ExtractedEntities;
  readonly topK?: number;
  /**
   * Aborts when the retrieval time budget expires. Resolvers making outbound HTTP calls should
   * thread this through so cancelled work actually stops instead of continuing in the background
   * after `KnowledgeService.retrieve()` has already returned.
   */
  readonly signal?: AbortSignal;
  /**
   * Reports time this resolver spent blocked on something other than real fetch/parse work
   * (e.g. a rate-limiter queue wait) so `KnowledgeService` can extend this resolver's own
   * deadline by that amount instead of it counting 1:1 against the resolver's overall budget
   * (DEV-59 Direction #1). Resolvers with nothing to report simply never call it -- most won't
   * need to.
   */
  readonly onQueueWait?: (waitedMs: number) => void;
}

/**
 * Retrieves relevant chunks from available sources for a given query.
 * ChatService depends on this interface to decouple retrieval from orchestration.
 */
export interface KnowledgeService {
  retrieve(query: string, options?: RetrieveOptions): Promise<RetrievalResult>;
}
