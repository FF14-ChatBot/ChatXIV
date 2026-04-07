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
  readonly language?: string;
  readonly entities?: ExtractedEntities;
  readonly topK?: number;
}

/**
 * Retrieves relevant chunks from available sources for a given query.
 * ChatService depends on this interface to decouple retrieval from orchestration.
 */
export interface KnowledgeService {
  retrieve(query: string, options?: RetrieveOptions): Promise<RetrievalResult>;
}
