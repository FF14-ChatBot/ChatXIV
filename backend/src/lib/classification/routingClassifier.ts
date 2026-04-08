import { UsageCategory } from '@chatxiv/cdm';
import {
  ClassificationRouting,
  type ClassificationResult,
  type ClassificationService,
  type UsageRoutingModel,
} from './types.js';

/**
 * Runs keyword rules first (confidence {@link ClassificationRouting.KeywordRuleConfidence} on hit).
 * If the message is still {@link UsageCategory.UNCATEGORIZED}, asks {@link UsageRoutingModel}
 * (e.g. LLM); accepts that result only when confidence is strictly above
 * {@link ClassificationRouting.LlmMinConfidenceExclusive}.
 */
export function createRoutingClassifier(
  keywordClassifier: ClassificationService,
  routingModel: UsageRoutingModel
): ClassificationService {
  return {
    async classify(message: string, language?: string): Promise<ClassificationResult> {
      const fromKeywords = await keywordClassifier.classify(message, language);
      if (fromKeywords.category !== UsageCategory.UNCATEGORIZED) {
        return fromKeywords;
      }

      const fromModel = await routingModel.classifyForRouting(message, language);
      if (
        fromModel.category !== UsageCategory.UNCATEGORIZED &&
        fromModel.confidence > ClassificationRouting.LlmMinConfidenceExclusive
      ) {
        return fromModel;
      }

      return {
        category: UsageCategory.UNCATEGORIZED,
        confidence: fromModel.confidence,
      };
    },
  };
}
