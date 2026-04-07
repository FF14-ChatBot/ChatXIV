import { UsageCategory } from '@chatxiv/cdm';
import type { ClassificationResult, UsageRoutingModel } from './types.js';

/**
 * Placeholder until a real LLM routing implementation exists.
 * Always leaves classification to keyword rules + uncategorized retrieval.
 */
export function createStubUsageRoutingModel(): UsageRoutingModel {
  return {
    async classifyForRouting(): Promise<ClassificationResult> {
      return { category: UsageCategory.UNCATEGORIZED, confidence: 0 };
    },
  };
}
