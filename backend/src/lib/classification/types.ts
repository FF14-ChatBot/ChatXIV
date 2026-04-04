import type { UsageCategory } from '@chatxiv/cdm';
import type { ExtractedEntities } from '../knowledge/types.js';

export interface ClassificationResult {
  readonly category: UsageCategory;
  /**
   * 0-1 confidence. When low, the KnowledgeService may query multiple
   * resolvers and merge results rather than trusting a single category.
   */
  readonly confidence: number;
  readonly entities?: ExtractedEntities;
}

/**
 * Determines what the user is asking about and which sources to query.
 * MVP: keyword/regex matching. Future: LLM-based or embedding-based classifier.
 */
export interface ClassificationService {
  classify(message: string, language?: string): Promise<ClassificationResult>;
}
