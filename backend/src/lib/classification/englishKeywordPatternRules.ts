import { UsageCategory } from '@chatxiv/cdm';

/**
 * One ordered keyword rule: first `RegExp.prototype.test` match in the English list wins.
 * Keep more specific patterns above broader ones.
 */
export interface KeywordPatternRule {
  readonly category: UsageCategory;
  readonly pattern: RegExp;
}

/**
 * English regex rules for the keyword routing stage only.
 *
 * Behavior and the uncategorized → LLM funnel are implemented in `keywordClassifier.ts`
 * (`createKeywordClassifier`). Add languages by exporting
 * additional rule arrays and registering them in `RULES_BY_LANGUAGE` there.
 *
 * Only add tokens that are unambiguous in FFXIV context; vague phrasing should miss and fall
 * through to LLM routing.
 */
export const englishKeywordPatternRules: readonly KeywordPatternRule[] = [
  {
    category: UsageCategory.GATHERING,
    pattern:
      /\b((gathering|gatherer|gather|miner|fisher|fsh|btn|botan\w*)\s+bis|bis\s+for\s+(gathering|gatherer|gather|miner|fisher|fsh|btn|botan\w*)|(gathering|gatherer|gather|miner|fisher|fsh|btn|botan\w*)\s+best\s+in\s+slot|best\s+in\s+slot\s+for\s+(gathering|gatherer|gather|miner|fisher|fsh|btn|botan\w*)|gather(ing|er)?|btn|botan\w*|miner|mining|mine|fisher|fsh|fishing|fish|dol|disciple of the land|timed\s+nodes?|ephemeral\s+nodes?|nodes?|gp|survival\s+manual|collectable)\b/i,
  },
  {
    category: UsageCategory.CRAFTING,
    pattern:
      /\b((crafting|crafter|craft|carpenter|crp|blacksmith|bsm|armorer|arm|goldsmith|gsm|leatherworker|ltw|weaver|wvr|alchemist|alc|culinarian|cul)\s+bis|bis\s+for\s+(crafting|crafter|craft|carpenter|crp|blacksmith|bsm|armorer|arm|goldsmith|gsm|leatherworker|ltw|weaver|wvr|alchemist|alc|culinarian|cul)|(crafting|crafter|craft|carpenter|crp|blacksmith|bsm|armorer|arm|goldsmith|gsm|leatherworker|ltw|weaver|wvr|alchemist|alc|culinarian|cul)\s+best\s+in\s+slot|best\s+in\s+slot\s+for\s+(crafting|crafter|craft|carpenter|crp|blacksmith|bsm|armorer|arm|goldsmith|gsm|leatherworker|ltw|weaver|wvr|alchemist|alc|culinarian|cul)|craft(ing|er)?|carpenter|crp|blacksmith|bsm|armorer|arm|goldsmith|gsm|leatherworker|ltw|weaver|wvr|alchemist|alc|culinarian|cul|recipe|collectab|firmament|doh|disciples?\s+of\s+the\s+hands?|cp|materia\s+melding|quick\s+synthesis|engineering\s+manual|repair|desynthesis|durability|progress|quality|condition|synthesis)\b/i,
  },
  {
    category: UsageCategory.BIS,
    pattern: /\b(bis|best.in.slot|etro|gear(ing|set)?|xivgear|meld(s|ing)?|materia)\b/i,
  },
  {
    category: UsageCategory.CRITERION,
    pattern:
      /\b(variant\s+and\s+criterion|v\s*&\s*c(?:\s+dungeons?|\s+dungeon\s+finder)?|variant\s+dungeons?|criterion\s+dungeons?|variant\s+advanced|advanced\s+variant|variant\s+\(advanced\)|savage\s+criterion|criterion\s+savage|criterion\s+\(savage\)|another\s+aloalo|another\s+rokko|another\s+sil|aloalo\s+island|mount\s+rokko|sil'?dihn|merchant'?s\s+tale|variant\s+actions?|criterion)\b/i,
  },
  {
    category: UsageCategory.RAIDING,
    pattern:
      /\b(raid|savage|extreme|ultimate|ex\d|[epm]\d+s|ucob|uwu|tea|dsr|top|fru|toolbox|hector|raidplan|kobe|endgame|high[\s-]?end|highend|difficult\s+content|door\s+boss)\b/i,
  },
  {
    category: UsageCategory.MSQ,
    pattern:
      /\b(msq|main.scenario|main.story|story.quest|quest.line|scenario\s+skip|praetorium|castrum\s+meridianum|decumana)\b/i,
  },
  {
    category: UsageCategory.FIELD_OPERATIONS,
    pattern:
      /\b(field\s+operations?|field\s+notes?|adventuring\s+foray|exploration\s+zones?|critical\s+engagements?|critical\s+encounters?|dalriada|skirmisher|zadnor|occult\s+crescent|save\s+the\s+queen|castrum\s+lacus|delubrum\s+reginae|baldesion\s+arsenal|bozjan\s+southern\s+front|logos\s+actions?|lost\s+actions?|phantom\s+jobs?)\b/i,
  },
  {
    category: UsageCategory.UNLOCKS,
    pattern:
      /\b(unlock|how.do.i.get|where.do.i.get|how.to.get|where.to.unlock|attune|aether(yte)?)\b/i,
  },
  {
    category: UsageCategory.SETTINGS,
    pattern: /\b(setting|config(uration|ure)?|hud|ui.option|camera|keybind|hotbar|display)\b/i,
  },
  {
    category: UsageCategory.SEASONAL_EVENTS,
    pattern:
      /\b(seasonal\s+events?|holiday\s+events?|seasonal\s+quests?|heavensturn|valentione(?:'s\s+day|\s+day)?|hatching[-\s]?tide|little\s+ladies'?|ladies['\u2019]s\s+day|all\s+saints['\u2019]?s?\s+wake|starlight(?:\s+celebration|\s+stalls)?|moonfire(?:\s+faire)?|make\s+it\s+rain|moogle\s+treasure\s+trove|moogle\s+tomestones?|mogpendium|moogle\s+events?)\b/i,
  },
  {
    category: UsageCategory.LIFESTYLE_CONTENT,
    pattern:
      /\b(island\s+sanctuary|custom\s+delivery|lifestyle\s+content|cosmic\s+exploration|ishgardian\s+restoration|skybuilders?'?\s+scrips?|isleworks|island\s+workshop|kupo\s+of\s+fortune|f[eê]tes|unnamed\s+island)\b/i,
  },
  {
    category: UsageCategory.GLAMOUR,
    pattern: /\b(glamou?r|wardrobe|dresser|prism|glam|transmog|dye(ing)?|outfit)\b/i,
  },
  {
    category: UsageCategory.HOUSING,
    pattern:
      /\b(hous(e|ing)|apartment|plot|ward|furnish|décor|decor|placard|lottery|furnishing)\b/i,
  },
  {
    category: UsageCategory.RELIC_WEAPONS,
    pattern: /\b(relic|anima|eureka|bozja|manderville|lux|zodiac|resistance)\b/i,
  },
  {
    category: UsageCategory.DEEP_DUNGEONS,
    pattern:
      /\b(potd|palace of the dead|heaven on high|\bhoh\b|eureka orthos|orthos|deep dungeon)\b/i,
  },
  {
    category: UsageCategory.BLUE_MAGE,
    pattern: /\b(blue mage|blue magic|\bblu\b|mask carnival|carnival challenge|morbol mount)\b/i,
  },
  {
    category: UsageCategory.PVP,
    pattern:
      /\b(\bpvp\b|crystalline conflict|frontline|rival wings|the feast|wolf mark|series malmstones|trophy crystals)\b/i,
  },
  {
    category: UsageCategory.FATES,
    pattern: /\b(\bfates?\b|boss fate|fate farm|forlorn maiden)\b/i,
  },
  {
    category: UsageCategory.GOLD_SAUCER,
    pattern:
      /\b(gold saucer|cactpot|chocobo race|mini cactpot|jumbo cactpot|triple triad|mahjong|lord of verminion|verminion|chocobo breed(ing)?|mgp|gates|fashion report)\b/i,
  },
  {
    category: UsageCategory.VENDORS,
    pattern:
      /\b(vendor|material supplier|tomestone exchange|scrip exchange|npc shop|purchase from npc|exchange)\b/i,
  },
  {
    category: UsageCategory.EXPLORATION,
    pattern: /\b(exploration|sightseeing log|sightseeing|adventurer in need|\bvista\b)\b/i,
  },
  {
    category: UsageCategory.COLLECTIBLES,
    pattern: /\b(orchestrion|titles|collection log|minion(s)?|achievement)\b/i,
  },
  {
    category: UsageCategory.PATCH_NOTES,
    pattern: /\b(patch notes|letter from the producer|live letter|\bpll\b|patch \d+\.\d+)\b/i,
  },
  {
    category: UsageCategory.ITEMS,
    pattern: /\b(item|drop|loot|reward|where.to.buy|tomestones?)\b/i,
  },
];
