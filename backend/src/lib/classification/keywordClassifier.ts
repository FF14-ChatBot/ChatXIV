import { UsageCategory } from '@chatxiv/cdm';
import type { ClassificationResult, ClassificationService } from './types.js';

interface PatternRule {
  readonly category: UsageCategory;
  readonly pattern: RegExp;
  readonly confidence: number;
}

/**
 * Pattern rules evaluated top-to-bottom; first match wins.
 * More specific patterns (higher confidence) go first.
 */
const RULES: readonly PatternRule[] = [
  {
    category: UsageCategory.GATHERING,
    pattern:
      /\b((gathering|gatherer|gather|miner|fisher|botanist|botani)\s+bis|bis\s+for\s+(gathering|gatherer|gather|miner|fisher|botanist|botani)|(gathering|gatherer|gather|miner|fisher|botanist|botani)\s+best\s+in\s+slot|best\s+in\s+slot\s+for\s+(gathering|gatherer|gather|miner|fisher|botanist|botani))\b/i,
    confidence: 0.85,
  },
  {
    category: UsageCategory.CRAFTING,
    pattern:
      /\b((crafting|crafter|craft)\s+bis|bis\s+for\s+(crafting|crafter|craft)|(crafting|crafter|craft)\s+best\s+in\s+slot|best\s+in\s+slot\s+for\s+(crafting|crafter|craft))\b/i,
    confidence: 0.85,
  },
  {
    category: UsageCategory.BIS,
    pattern: /\b(bis|best.in.slot|gear(ing|set)?|meld(s|ing)?|materia)\b/i,
    confidence: 0.8,
  },
  {
    category: UsageCategory.RAIDING,
    pattern:
      /\b(raid|savage|extreme|ultimate|ex\d|[epm]\d+s|ucob|uwu|tea|dsr|top|fru|toolbox|hector|raidplan|kobe)\b/i,
    confidence: 0.8,
  },
  {
    category: UsageCategory.MSQ,
    pattern: /\b(msq|main.scenario|main.story|story.quest|quest.line)\b/i,
    confidence: 0.8,
  },
  {
    category: UsageCategory.UNLOCKS,
    pattern: /\b(unlock|how.do.i.get|how.to.get|where.to.unlock|attune|aether(yte)?)\b/i,
    confidence: 0.75,
  },
  {
    category: UsageCategory.SETTINGS,
    pattern: /\b(setting|config(uration|ure)?|hud|ui.option|camera|keybind|hotbar|display)\b/i,
    confidence: 0.75,
  },
  {
    category: UsageCategory.CRAFTING,
    pattern:
      /\b(craft(ing|er)?|recipe|collectab|firmament|doh|disciple of the hands|lunar\s+envoy|cp)\b/i,
    confidence: 0.7,
  },
  {
    category: UsageCategory.GATHERING,
    pattern:
      /\b(gather(ing|er)?|botanist|botani|miner|mining|fisher|fishing|dol|disciple of the land|timed\s+nodes?|ephemeral\s+nodes?|gp|collectable)\b/i,
    confidence: 0.7,
  },
  {
    category: UsageCategory.GLAMOUR,
    pattern: /\b(glamour|glam|transmog|fashion|dye(ing)?|outfit)\b/i,
    confidence: 0.7,
  },
  {
    category: UsageCategory.HOUSING,
    pattern: /\b(hous(e|ing)|apartment|plot|ward|furnish|décor|decor|lottery)\b/i,
    confidence: 0.7,
  },
  {
    category: UsageCategory.RELIC_WEAPONS,
    pattern: /\b(relic|anima|eureka|bozja|manderville|lux|zodiac|resistance)\b/i,
    confidence: 0.7,
  },
  {
    category: UsageCategory.ITEMS,
    pattern: /\b(item|drop|loot|reward|vendor|where.to.buy|tomestone)\b/i,
    confidence: 0.6,
  },
];

/**
 * MVP classifier using regex pattern matching.
 * Swap to an LLM-based classifier by replacing this in container.ts.
 */
export function createKeywordClassifier(): ClassificationService {
  return {
    async classify(message: string): Promise<ClassificationResult> {
      for (const rule of RULES) {
        if (rule.pattern.test(message)) {
          return { category: rule.category, confidence: rule.confidence };
        }
      }

      return { category: UsageCategory.UNCATEGORIZED, confidence: 0 };
    },
  };
}
