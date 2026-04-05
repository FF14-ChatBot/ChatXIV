import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { ClassificationRouting } from '@src/lib/classification/types.js';
import { createKeywordClassifier } from '@src/lib/classification/keywordClassifier.js';

describe('createKeywordClassifier', () => {
  const classifier = createKeywordClassifier();

  describe('gathering', () => {
    it('classifies gatherer leveling questions', async () => {
      const r = await classifier.classify('whats the best place for leveling my gatherer?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches timed node questions for miners (case insensitive)', async () => {
      const r = await classifier.classify('timed NODES for miner');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gathering nodes for a patch version', async () => {
      const r = await classifier.classify('what are all the nodes for 7.4?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('classifies fisher unlock questions (mixed case)', async () => {
      const r = await classifier.classify('where do I unlock FiShEr?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches DOL shorthand', async () => {
      const r = await classifier.classify('what are dol?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches disciple of the land', async () => {
      const r = await classifier.classify('what is a disciple of the land?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches ephemeral nodes', async () => {
      const r = await classifier.classify('what are ephemeral nodes?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches GP as a gathering stat', async () => {
      const r = await classifier.classify('what does gp stand for?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches botanist despite unlock + typo spelling', async () => {
      const r = await classifier.classify('how do I unlock botanyst?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches ocean fishing', async () => {
      const r = await classifier.classify('what are the next times for ocean fishing?');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gathering bis for botanist', async () => {
      const r = await classifier.classify('what bis for botanist');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches btn job shorthand', async () => {
      const r = await classifier.classify('btn collectables');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches fsh job shorthand', async () => {
      const r = await classifier.classify('fsh ocean routes');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches survival manual', async () => {
      const r = await classifier.classify('does survival manual stack');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches singular gathering node', async () => {
      const r = await classifier.classify('which node has silk fleece');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches timed node singular (mixed case)', async () => {
      const r = await classifier.classify('TIMED NODE for darksteel ore');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches ephemeral node singular', async () => {
      const r = await classifier.classify('ephemeral node window');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gather, gatherer, and gathering', async () => {
      const r = await classifier.classify('gather vs gatherer vs gathering gear');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches mining and miner job name', async () => {
      const r = await classifier.classify('MINING route for MINER');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches mine as a gathering keyword', async () => {
      const r = await classifier.classify('where to mine darksteel');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches standalone fish', async () => {
      const r = await classifier.classify('big fish tracker');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches FISHING in caps', async () => {
      const r = await classifier.classify('OCEAN FISHING schedule');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches botanist with correct spelling', async () => {
      const r = await classifier.classify('botanist questline herbs');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches BTN bis phrasing (mixed case)', async () => {
      const r = await classifier.classify('BiS for BTN accessories');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches fsh bis phrasing', async () => {
      const r = await classifier.classify('bis for fsh melds');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches miner best in slot phrasing (mixed case)', async () => {
      const r = await classifier.classify('BEST IN SLOT for Miner');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gatherer bis with job keyword first', async () => {
      const r = await classifier.classify('gatherer bis melds 7.4');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches collectable for gatherers', async () => {
      const r = await classifier.classify('collectable rotation botany');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches GP in caps', async () => {
      const r = await classifier.classify('how much GP for three hits');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches survival manual (mixed case)', async () => {
      const r = await classifier.classify('SURVIVAL MANUAL buff');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches disciple of the land (mixed case)', async () => {
      const r = await classifier.classify('DISCIPLE OF THE LAND jobs');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches DOL in caps', async () => {
      const r = await classifier.classify('what is DOL in FFXIV');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('crafting', () => {
    it('matches plural disciples of the hand', async () => {
      const r = await classifier.classify('what are disciples of the hand?');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches singular disciple of the hands', async () => {
      const r = await classifier.classify('what are disciple of the hands?');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches crp bis phrasing', async () => {
      const r = await classifier.classify('crp bis melds');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches materia melding before bare materia', async () => {
      const r = await classifier.classify('how does materia melding work');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches quick synthesis and desynthesis', async () => {
      const r = await classifier.classify('quick synthesis and desynthesis');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches engineering manual', async () => {
      const r = await classifier.classify('where engineering manual');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches canonical disciple of the hand', async () => {
      const r = await classifier.classify('what is a disciple of the hand?');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches carpenter and culinarian job names', async () => {
      const r = await classifier.classify('leveling carpenter vs culinarian');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches blacksmith, goldsmith, leatherworker, and weaver', async () => {
      const r = await classifier.classify('blacksmith goldsmith leatherworker weaver glam');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches alchemist', async () => {
      const r = await classifier.classify('potions alchemist rotation');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bsm bis phrasing (mixed case)', async () => {
      const r = await classifier.classify('BiS for BSM in 7.4');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gsm best in slot phrasing (mixed case)', async () => {
      const r = await classifier.classify('BEST IN SLOT for GsM accessories');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches ltw and wvr abbreviations', async () => {
      const r = await classifier.classify('ltw and wvr gearsets');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches alc and cul in bis context', async () => {
      const r = await classifier.classify('bis for ALC and CUL');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches arm as armorer in bis context', async () => {
      const r = await classifier.classify('bis for arm chest piece');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches DOH shorthand', async () => {
      const r = await classifier.classify('what jobs count as DOH');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches CP as crafting stat', async () => {
      const r = await classifier.classify('how much CP for this macro');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches recipe and collectab typo', async () => {
      const r = await classifier.classify('recipe for collectab turn-in');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches repair and desynthesis', async () => {
      const r = await classifier.classify('REPAIR kit vs desynthesis');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches durability, progress, quality, and condition', async () => {
      const r = await classifier.classify('durability progress quality condition in one craft');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches synthesis without quick prefix', async () => {
      const r = await classifier.classify('normal Synthesis vs specialist');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches quick synthesis (mixed case)', async () => {
      const r = await classifier.classify('enable QUICK SYNTHESIS');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches materia melding (mixed case)', async () => {
      const r = await classifier.classify('MATERIA MELDING specialist');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches engineering manual (mixed case)', async () => {
      const r = await classifier.classify('ENGINEERING MANUAL stacks');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('bis', () => {
    it('matches job abbreviation with bis and patch', async () => {
      const r = await classifier.classify('what is mnk bis for 7.4?');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bis before raid acronym in the same message', async () => {
      const r = await classifier.classify('what is my bis for ucob?');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bis in mixed case', async () => {
      const r = await classifier.classify('BiS list for PLD');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches best in slot with spaces', async () => {
      const r = await classifier.classify('best in slot for sage this tier');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches best in slot phrasing (mixed case)', async () => {
      const r = await classifier.classify('BEST IN SLOT healer');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches hyphenated best-in-slot style', async () => {
      const r = await classifier.classify('best-in-slot tank gear');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches etro', async () => {
      const r = await classifier.classify('etro link for my drg');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches xivgear', async () => {
      const r = await classifier.classify('import this set into xivgear');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gear', async () => {
      const r = await classifier.classify('tank gear for fru');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gearing', async () => {
      const r = await classifier.classify('endgame gearing priorities');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches gearset', async () => {
      const r = await classifier.classify('import a gearset from etro');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches meld', async () => {
      const r = await classifier.classify('safe meld on chest');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches melds', async () => {
      const r = await classifier.classify('overcap melds worth it');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches melding as a whole word', async () => {
      const r = await classifier.classify('advanced melding unlock');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches melding in caps', async () => {
      const r = await classifier.classify('MELDING caps for accessories');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bare materia (not materia melding phrase)', async () => {
      const r = await classifier.classify('which combat materia for dps');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches materia in caps', async () => {
      const r = await classifier.classify('MATERIA VI vs VII');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bis with savage tier without losing to RAIDING first hit on bis', async () => {
      const r = await classifier.classify('bis for p12s phase 2');
      expect(r.category).toBe(UsageCategory.BIS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('criterion', () => {
    it('matches variant and criterion (wiki umbrella phrasing)', async () => {
      const r = await classifier.classify('variant and criterion dungeon il sync');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches V&C dungeon finder shorthand', async () => {
      const r = await classifier.classify('where is V&C dungeon finder');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches variant dungeon and criterion dungeon', async () => {
      const v = await classifier.classify("variant dungeon routes Sil'dihn");
      expect(v.category).toBe(UsageCategory.CRITERION);
      const c = await classifier.classify('criterion dungeon party comp');
      expect(c.category).toBe(UsageCategory.CRITERION);
    });

    it('matches savage criterion before bare savage (rule order)', async () => {
      const r = await classifier.classify('savage criterion mount rokko tips');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches criterion savage ordering', async () => {
      const r = await classifier.classify('criterion savage manuscript grind');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it("matches advanced variant (Merchant's Tale style)", async () => {
      const r = await classifier.classify('advanced variant unlock Osmon');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches wiki dungeon names', async () => {
      const r = await classifier.classify('aloalo island mount secret boss');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it("matches mount rokko and Sil'dihn", async () => {
      const rokko = await classifier.classify('mount rokko lore entries');
      expect(rokko.category).toBe(UsageCategory.CRITERION);
      const sil = await classifier.classify("Another Sil'dihn Subterrane coins");
      expect(sil.category).toBe(UsageCategory.CRITERION);
    });

    it("matches merchant's tale", async () => {
      const r = await classifier.classify("The Merchant's Tale levelling");
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches variant actions (wiki)', async () => {
      const r = await classifier.classify('which variant action for tank in V&C');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches bare criterion token', async () => {
      const r = await classifier.classify('criterion coins exchange');
      expect(r.category).toBe(UsageCategory.CRITERION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('raiding', () => {
    it('classifies savage tier shorthand as RAIDING', async () => {
      const r = await classifier.classify('P8S mechanics');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches endgame', async () => {
      const r = await classifier.classify('what to do for endgame');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches high end with a space', async () => {
      const r = await classifier.classify('high end raid tips');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches high-end hyphenated', async () => {
      const r = await classifier.classify('high-end duties');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches highend compound', async () => {
      const r = await classifier.classify('highend glam questions');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches difficult content', async () => {
      const r = await classifier.classify('how to learn difficult content');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches endgame in caps', async () => {
      const r = await classifier.classify('ENDGAME checklist');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches door boss', async () => {
      const r = await classifier.classify('tips for the door boss');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches door boss (mixed case)', async () => {
      const r = await classifier.classify('DOOR BOSS markers');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('msq', () => {
    it('matches msq shorthand (forum/reddit style)', async () => {
      const r = await classifier.classify('should I do msq or side content first');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches MSQ in caps', async () => {
      const r = await classifier.classify('stuck after MSQ roulette unlock');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches scenario skip (common skip-potion / catch-up threads)', async () => {
      const r = await classifier.classify('which scenario skip gets me to Heavensward');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches scenario skip (mixed case)', async () => {
      const r = await classifier.classify('ARR SCENARIO SKIP worth it');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches main scenario quest progression wording', async () => {
      const r = await classifier.classify('where is my next main scenario quest');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches main story (new player progression posts)', async () => {
      const r = await classifier.classify('when to do side quests vs main story');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches main story with mixed case', async () => {
      const r = await classifier.classify('MAIN STORY cutscene too long');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches story quest phrasing', async () => {
      const r = await classifier.classify('what is my current story quest');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches quest line gating', async () => {
      const r = await classifier.classify('dungeon locked behind quest line');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches praetorium and castrum meridianum duty names', async () => {
      const p = await classifier.classify('praetorium cutscene length');
      expect(p.category).toBe(UsageCategory.MSQ);
      const c = await classifier.classify('castrum meridianum first time');
      expect(c.category).toBe(UsageCategory.MSQ);
    });

    it('prefers MSQ over UNLOCKS when both appear (msq first in rule order)', async () => {
      const r = await classifier.classify('how do I unlock the next msq');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('prefers MSQ over UNLOCKS for main scenario unlock wording', async () => {
      const r = await classifier.classify('how to unlock main scenario duties');
      expect(r.category).toBe(UsageCategory.MSQ);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('field operations', () => {
    it('matches field operations and adventuring foray (wiki terms)', async () => {
      const a = await classifier.classify('field operations relic grind');
      expect(a.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const b = await classifier.classify('adventuring foray Bozja leveling');
      expect(b.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches exploration zones (player term for field ops)', async () => {
      const r = await classifier.classify('which exploration zone is best for leveling');
      expect(r.category).toBe(UsageCategory.FIELD_OPERATIONS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches critical engagements and encounters (Bozja / Occult Crescent)', async () => {
      const ce = await classifier.classify('critical engagement timer Bozja');
      expect(ce.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const cx = await classifier.classify('critical encounter Occult Crescent');
      expect(cx.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches Eureka-adjacent duties and Save the Queen (wiki)', async () => {
      const dr = await classifier.classify('Delubrum Reginae fragment farm');
      expect(dr.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const stq = await classifier.classify('Save the Queen unlock order');
      expect(stq.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches Zadnor Dalriada and Baldesion Arsenal', async () => {
      const z = await classifier.classify('zadnor cluster farm');
      expect(z.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const d = await classifier.classify('Dalriada Castrum route');
      expect(d.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const ba = await classifier.classify('Baldesion Arsenal portal');
      expect(ba.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches Bozjan Southern Front and Occult Crescent', async () => {
      const b = await classifier.classify('Bozjan Southern Front mettle');
      expect(b.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const o = await classifier.classify('Occult Crescent South Horn map');
      expect(o.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches Logos Lost and Phantom job mechanics (wiki)', async () => {
      const l = await classifier.classify('logos action rotation Eureka');
      expect(l.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const la = await classifier.classify('lost action holster Bozja');
      expect(la.category).toBe(UsageCategory.FIELD_OPERATIONS);
      const p = await classifier.classify('phantom job Occult Crescent');
      expect(p.category).toBe(UsageCategory.FIELD_OPERATIONS);
    });

    it('matches Castrum Lacus Litore shorthand', async () => {
      const r = await classifier.classify('castrum lacus litore queue');
      expect(r.category).toBe(UsageCategory.FIELD_OPERATIONS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('lifestyle content', () => {
    it('matches umbrella lifestyle content phrasing', async () => {
      const r = await classifier.classify('lifestyle content for crafters');
      expect(r.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches Island Sanctuary and custom delivery', async () => {
      const i = await classifier.classify('island sanctuary cowries');
      expect(i.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      const c = await classifier.classify('custom delivery Zhloe');
      expect(c.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
    });

    it('matches Cosmic Exploration and Ishgardian Restoration (wiki)', async () => {
      const ce = await classifier.classify('Cosmic Exploration mission rewards');
      expect(ce.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      const ir = await classifier.classify('Ishgardian Restoration skyward score');
      expect(ir.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
    });

    it('matches Skybuilders scrip Isleworks and workshop', async () => {
      const s = await classifier.classify('Skybuilders scrip mount');
      expect(s.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      const w = await classifier.classify('isleworks handicrafts island workshop');
      expect(w.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
    });

    it('matches Kupo of Fortune fetes and unnamed island', async () => {
      const k = await classifier.classify('kupo of fortune ticket');
      expect(k.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      const f = await classifier.classify('weekly fetes glam rewards');
      expect(f.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
      const u = await classifier.classify('unnamed island rare animal');
      expect(u.category).toBe(UsageCategory.LIFESTYLE_CONTENT);
    });
  });

  describe('seasonal events', () => {
    it('matches seasonal and holiday events (wiki)', async () => {
      const s = await classifier.classify('seasonal event rewards this year');
      expect(s.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const h = await classifier.classify('holiday events schedule FFXIV');
      expect(h.category).toBe(UsageCategory.SEASONAL_EVENTS);
    });

    it('matches seasonal quests', async () => {
      const r = await classifier.classify('seasonal quest expired items');
      expect(r.category).toBe(UsageCategory.SEASONAL_EVENTS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches named festivals from the seasonal events page', async () => {
      const ht = await classifier.classify('Heavensturn rewards');
      expect(ht.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const v = await classifier.classify("Valentione's Day outfit");
      expect(v.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const hatch = await classifier.classify('Hatching-tide egg hunt');
      expect(hatch.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const lld = await classifier.classify("Little Ladies' Day glamour");
      expect(lld.category).toBe(UsageCategory.SEASONAL_EVENTS);
    });

    it('matches All Saints Wake Starlight and Moonfire Faire', async () => {
      const as = await classifier.classify("All Saints' Wake haunted manor");
      expect(as.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const sc = await classifier.classify('Starlight Celebration market');
      expect(sc.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const ss = await classifier.classify('Starlight Stalls minion');
      expect(ss.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const mf = await classifier.classify('Moonfire Faire swimsuit');
      expect(mf.category).toBe(UsageCategory.SEASONAL_EVENTS);
    });

    it('matches Make It Rain campaign', async () => {
      const r = await classifier.classify('Make It Rain MGP bonus');
      expect(r.category).toBe(UsageCategory.SEASONAL_EVENTS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('matches Moogle Treasure Trove tomestones mogpendium and moogle event phrasing', async () => {
      const trove = await classifier.classify('Moogle Treasure Trove objectives list');
      expect(trove.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const tomestone = await classifier.classify('moogle tomestone exchange');
      expect(tomestone.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const mog = await classifier.classify('mogpendium rewards');
      expect(mog.category).toBe(UsageCategory.SEASONAL_EVENTS);
      const ev = await classifier.classify('current moogle event schedule');
      expect(ev.category).toBe(UsageCategory.SEASONAL_EVENTS);
    });
  });

  describe('unlocks', () => {
    it('matches unlock and how or where to get phrasing', async () => {
      const u = await classifier.classify('how do I unlock alliance raids');
      expect(u.category).toBe(UsageCategory.UNLOCKS);
      const g = await classifier.classify('where do I get the empyrean accessory');
      expect(g.category).toBe(UsageCategory.UNLOCKS);
    });

    it('matches attune and aetheryte wording', async () => {
      const r = await classifier.classify('cannot attune to this aetheryte');
      expect(r.category).toBe(UsageCategory.UNLOCKS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('settings', () => {
    it('matches HUD camera keybind and configuration tokens', async () => {
      const h = await classifier.classify('HUD layout too small on ultrawide');
      expect(h.category).toBe(UsageCategory.SETTINGS);
      const c = await classifier.classify('camera collision while mounted');
      expect(c.category).toBe(UsageCategory.SETTINGS);
    });
  });

  describe('glamour', () => {
    it('matches US spelling glamor and UK glamour', async () => {
      const us = await classifier.classify('glamor plate not updating');
      expect(us.category).toBe(UsageCategory.GLAMOUR);
      const uk = await classifier.classify('full glamour set for tank');
      expect(uk.category).toBe(UsageCategory.GLAMOUR);
    });

    it('matches outfit dye and prism tokens', async () => {
      const r = await classifier.classify('dyeable outfit from dungeon');
      expect(r.category).toBe(UsageCategory.GLAMOUR);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('housing', () => {
    it('matches ward plot lottery and furnishing', async () => {
      const w = await classifier.classify('ward 15 plot 32 how to visit');
      expect(w.category).toBe(UsageCategory.HOUSING);
      const l = await classifier.classify('housing lottery entry period');
      expect(l.category).toBe(UsageCategory.HOUSING);
    });
  });

  describe('relic weapons', () => {
    it('matches relic and manderville weapon grind phrasing', async () => {
      const r = await classifier.classify('relic weapon step 3 mats');
      expect(r.category).toBe(UsageCategory.RELIC_WEAPONS);
      const m = await classifier.classify('manderville weapon last step');
      expect(m.category).toBe(UsageCategory.RELIC_WEAPONS);
    });
  });

  describe('deep dungeons', () => {
    it('matches potd HoH and deep dungeon orthos (eureka alone hits relic rule first)', async () => {
      const p = await classifier.classify('potd solo 190+');
      expect(p.category).toBe(UsageCategory.DEEP_DUNGEONS);
      const h = await classifier.classify('HoH pomander guide');
      expect(h.category).toBe(UsageCategory.DEEP_DUNGEONS);
      const o = await classifier.classify('deep dungeon orthos floor 30');
      expect(o.category).toBe(UsageCategory.DEEP_DUNGEONS);
    });
  });

  describe('blue mage', () => {
    it('matches blue mage spells and mask carnival', async () => {
      const b = await classifier.classify('blue mage spell list level 80');
      expect(b.category).toBe(UsageCategory.BLUE_MAGE);
      const m = await classifier.classify('mask carnival stage tips');
      expect(m.category).toBe(UsageCategory.BLUE_MAGE);
    });
  });

  describe('pvp', () => {
    it('matches crystalline conflict and series malmstones', async () => {
      const cc = await classifier.classify('crystalline conflict tier rewards');
      expect(cc.category).toBe(UsageCategory.PVP);
      const s = await classifier.classify('series malmstones weekly cap');
      expect(s.category).toBe(UsageCategory.PVP);
    });
  });

  describe('fates', () => {
    it('matches fate farm and boss fate', async () => {
      const f = await classifier.classify('fate farm eastern thanalan');
      expect(f.category).toBe(UsageCategory.FATES);
      const b = await classifier.classify('boss fate timer too short');
      expect(b.category).toBe(UsageCategory.FATES);
    });
  });

  describe('gold saucer', () => {
    it('matches triple triad fashion report and mgp', async () => {
      const t = await classifier.classify('triple triad tournament NPC deck');
      expect(t.category).toBe(UsageCategory.GOLD_SAUCER);
      const f = await classifier.classify('fashion report weekly clues');
      expect(f.category).toBe(UsageCategory.GOLD_SAUCER);
    });

    it('documents fashion report plus dye hits GLAMOUR first (rule order)', async () => {
      const r = await classifier.classify('fashion report dye hints this week');
      expect(r.category).toBe(UsageCategory.GLAMOUR);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('exploration', () => {
    it('matches sightseeing log and vista tokens', async () => {
      const r = await classifier.classify('sightseeing log ARR vista list');
      expect(r.category).toBe(UsageCategory.EXPLORATION);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('collectibles', () => {
    it('matches orchestrion minion and achievement wording', async () => {
      const o = await classifier.classify('orchestrion roll from dungeon drop');
      expect(o.category).toBe(UsageCategory.COLLECTIBLES);
      const m = await classifier.classify('minion drop from treasure map');
      expect(m.category).toBe(UsageCategory.COLLECTIBLES);
    });

    it('documents savage tier token winning over collectibles (rule order)', async () => {
      const r = await classifier.classify('orchestrion roll from savage');
      expect(r.category).toBe(UsageCategory.RAIDING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('items', () => {
    it('matches tomestone singular and plural currency questions', async () => {
      const r = await classifier.classify('tomestones of comedy weekly cap');
      expect(r.category).toBe(UsageCategory.ITEMS);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  describe('uncategorized and LLM funnel (keyword stage)', () => {
    it('returns UNCATEGORIZED for generic text with no keyword hits', async () => {
      const r = await classifier.classify('abcdefghijklmnopqrstuvwxyz');
      expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
      expect(r.confidence).toBe(0);
    });

    it('returns UNCATEGORIZED for plausible FFXIV questions with no keyword token', async () => {
      const rot = await classifier.classify('samurai rotation opener 7.x');
      expect(rot.category).toBe(UsageCategory.UNCATEGORIZED);
      expect(rot.confidence).toBe(0);
      const trial = await classifier.classify('is Thordan still in trial roulette');
      expect(trial.category).toBe(UsageCategory.UNCATEGORIZED);
      const patch = await classifier.classify('what patch is FFXIV on right now');
      expect(patch.category).toBe(UsageCategory.UNCATEGORIZED);
    });

    it('returns UNCATEGORIZED for common typos absent from patterns (LLM may recover)', async () => {
      const msqe = await classifier.classify('skip to hdw msqe');
      expect(msqe.category).toBe(UsageCategory.UNCATEGORIZED);
      const glamur = await classifier.classify('glamur plate wrong race');
      expect(glamur.category).toBe(UsageCategory.UNCATEGORIZED);
    });

    it('does not classify casual use of story without MSQ-shaped tokens', async () => {
      const r = await classifier.classify('I love the writing in this expansion story');
      expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
      expect(r.confidence).toBe(0);
    });

    it('does not classify bare quest without quest line / story quest pattern', async () => {
      const r = await classifier.classify('best daily quest to farm gil');
      expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
      expect(r.confidence).toBe(0);
    });

    it('documents standalone fish matching gathering (known limitation)', async () => {
      const r = await classifier.classify('going out for fish and chips');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('documents crafting quality token matching generic English (known limitation)', async () => {
      const r = await classifier.classify('what is the video quality on PS5');
      expect(r.category).toBe(UsageCategory.CRAFTING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });

    it('documents mine as pronoun matching gathering keyword (known limitation)', async () => {
      const r = await classifier.classify('finally prog is mine tonight');
      expect(r.category).toBe(UsageCategory.GATHERING);
      expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
    });
  });

  it('uses English rules for explicit en-US', async () => {
    const r = await classifier.classify('P8S mechanics', 'en-US');
    expect(r.category).toBe(UsageCategory.RAIDING);
  });

  it('skips English patterns when language has no ruleset yet', async () => {
    const r = await classifier.classify('P8S savage raid', 'ja');
    expect(r.category).toBe(UsageCategory.UNCATEGORIZED);
    expect(r.confidence).toBe(0);
  });

  it('classifies gatherer terms as GATHERING', async () => {
    const r = await classifier.classify('timed nodes for miner');
    expect(r.category).toBe(UsageCategory.GATHERING);
    expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
  });

  it('classifies craft terms as CRAFTING', async () => {
    const r = await classifier.classify('firmament crafting');
    expect(r.category).toBe(UsageCategory.CRAFTING);
    expect(r.confidence).toBe(ClassificationRouting.KeywordRuleConfidence);
  });

  it('prefers craft/gather bis rules over generic BIS', async () => {
    const craftBis = await classifier.classify('crafting bis melds');
    expect(craftBis.category).toBe(UsageCategory.CRAFTING);
    const gatherBis = await classifier.classify('gathering bis gear');
    expect(gatherBis.category).toBe(UsageCategory.GATHERING);
  });

  it('matches patch notes before broad ITEMS-style phrases', async () => {
    const r = await classifier.classify('patch notes 7.2');
    expect(r.category).toBe(UsageCategory.PATCH_NOTES);
  });

  it('matches vendors before generic item questions', async () => {
    const r = await classifier.classify('where is the tomestone exchange vendor');
    expect(r.category).toBe(UsageCategory.VENDORS);
  });
});
