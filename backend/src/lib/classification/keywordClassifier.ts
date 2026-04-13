import { Languages, UsageCategory, type Language } from '@chatxiv/cdm';
import {
  englishKeywordPatternRules,
  type KeywordPatternRule,
} from './englishKeywordPatternRules.js';
import { resolveKeywordLanguage } from './keywordLanguage.js';
import {
  ClassificationRouting,
  type ClassificationResult,
  type ClassificationService,
} from './types.js';

/**
 * ## Keyword stage vs {@link UsageCategory.UNCATEGORIZED}
 *
 * `UsageCategory.UNCATEGORIZED` (wire value `OTHER` in `@chatxiv/cdm`) means **no English keyword
 * rule fired**. {@link createRoutingClassifier} then calls {@link UsageRoutingModel} (typically an
 * LLM) when language has rules; see {@link ClassificationRouting.LlmMinConfidenceExclusive}.
 *
 * **Intentionally uncategorized** (examples — should reach LLM or stay broad):
 * - Typos and variants we do not encode (`msqe`, `glamur`, `tombstone` for tomestone, etc.).
 * - Natural phrasing with no token (`rotation for samurai`, `is Thordan still in roulette`).
 * - Non-English copy pasted without Latin job/duty tokens matching these patterns.
 * - Languages with no rules table yet — patterns are skipped entirely → uncategorized with
 *   confidence `0` (same funnel).
 *
 * **Do not** widen regexes to chase every typo unless the variant is unambiguous; false positives
 * are worse than an LLM pass. Prefer tests that document “stays uncategorized” vs “known false
 * positive” for a few high-signal tokens (`fish`, `quality`, `mine`).
 *
 * Several rules use `.` in alternations (e.g. `best.in.slot`) as a **flexible separator** (space,
 * hyphen, dot). Other dotted groups like `main.scenario` follow the same idea.
 *
 * English regex rows live in {@link englishKeywordPatternRules} so this file stays the service
 * implementation and language dispatch only.
 */
const RULES_BY_LANGUAGE: Record<Language, readonly KeywordPatternRule[]> = {
  [Languages.En]: englishKeywordPatternRules,
};

function patternRulesForLanguage(language?: string | null): readonly KeywordPatternRule[] {
  const key = resolveKeywordLanguage(language);
  if (key === null) {
    return [];
  }
  return RULES_BY_LANGUAGE[key];
}

/**
 * Regex-based classifier: first routing stage with deterministic confidence on match.
 * Only `Languages.En` has rules today; other `language` values skip patterns (see module doc:
 * {@link UsageCategory.UNCATEGORIZED} funnel). Pair with {@link createRoutingClassifier} +
 * {@link UsageRoutingModel} for LLM fallback.
 */
export function createKeywordClassifier(): ClassificationService {
  return {
    async classify(message: string, language?: string): Promise<ClassificationResult> {
      const rules = patternRulesForLanguage(language);
      for (const rule of rules) {
        if (rule.pattern.test(message)) {
          return {
            category: rule.category,
            confidence: ClassificationRouting.KeywordRuleConfidence,
          };
        }
      }

      return { category: UsageCategory.UNCATEGORIZED, confidence: 0 };
    },
  };
}
