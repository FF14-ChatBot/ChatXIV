import type { UsageCategory } from '@chatxiv/cdm';
import type { ExtractedEntities } from '../knowledge/types.js';

/** Tunables for keyword + LLM routing. */
export const ClassificationRouting = {
  /** Keyword pattern hits are treated as certain. */
  KeywordRuleConfidence: 1,
  /**
   * When keywords return {@link UsageCategory.UNCATEGORIZED}, an LLM may propose a category
   * only if its confidence is strictly above this value.
   */
  LlmMinConfidenceExclusive: 0.5,
} as const;

export interface ClassificationResult {
  readonly category: UsageCategory;
  /**
   * 0–1 confidence. Keyword rules use {@link ClassificationRouting.KeywordRuleConfidence}.
   * When low, the KnowledgeService may query multiple resolvers and merge results.
   */
  readonly confidence: number;
  readonly entities?: ExtractedEntities;
}

/**
 * Determines what the user is asking about and which sources to query.
 * Primary: keyword rules (see {@link createKeywordClassifier}). Fallback when uncategorized:
 * {@link UsageRoutingModel} (typically an LLM structured call).
 */
export interface ClassificationService {
  classify(message: string, language?: string): Promise<ClassificationResult>;
}

/**
 * Second-stage classifier (e.g. LLM JSON) used only when keyword rules yield
 * {@link UsageCategory.UNCATEGORIZED}.
 */
export interface UsageRoutingModel {
  classifyForRouting(message: string, language?: string): Promise<ClassificationResult>;
}
