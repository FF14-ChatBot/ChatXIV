/**
 * Hand-maintained pointers to external Best-in-Slot guides, keyed by job.
 *
 * Link-only by design: gear priorities shift with every balance patch, and reproducing another
 * site's curated recommendations as our own text raises a reproduction-rights question distinct
 * from the raw-game-data question XIVAPI/MediaWiki already deal with. Pointing at whoever is
 * actually keeping the answer current avoids both the staleness risk and that question.
 *
 * TODO(DEV-63): Middle-ground option, deliberately deferred rather than forgotten -- store just
 * the stat-priority order (e.g. "Crit > DH > Det") per job/content alongside the link, so the
 * LLM has something to discuss beyond "go here" without taking on full gear-list maintenance.
 */

/**
 * Patch this data was last reviewed against. Bump this whenever a new patch drops.
 *
 * Every `populated: true` entry whose `patch` no longer matches gets `stale: true` on its
 * citation (see curatedDataResolver.ts) until someone re-confirms and updates it -- and
 * curatedBisLinks.test.ts asserts no entry is currently stale, so bumping this without updating
 * entries fails the suite immediately instead of silently shipping outdated links.
 */
export const CURRENT_PATCH = '7.2';

/**
 * What kind of BiS an entry covers. A job can have more than one entry -- e.g. separate Savage
 * and Extreme rows -- distinguished by this field; see the commented example below.
 */
export const BisContentType = {
  SAVAGE: 'Savage',
  EXTREME: 'Extreme',
  ULTIMATE: 'Ultimate',
  LEVELING: 'Leveling',
  CRAFTING_GEAR: 'Crafting gear',
  GATHERING_GEAR: 'Gathering gear',
} as const;
export type BisContentType = (typeof BisContentType)[keyof typeof BisContentType];

interface CuratedBisLinkEntryBase {
  /** Canonical job name, e.g. "Reaper". Always matches on its own -- no need to also list it
   *  (or a lowercase copy of it) in `jobAliases`; only add abbreviations/nicknames there. */
  readonly job: string;
  /** Abbreviations or nicknames that identify this job in free text, e.g. "rpr". */
  readonly jobAliases: readonly string[];
  readonly contentType: BisContentType;
}

/**
 * No real guide configured yet. Deliberately has no `sourceUrl` field at all -- not an empty
 * string, not a placeholder link -- so there's no way for a fake URL to accidentally reach a
 * citation. The resolver reports this honestly instead of guessing or staying silent.
 */
export interface UnpopulatedCuratedBisLinkEntry extends CuratedBisLinkEntryBase {
  readonly populated: false;
}

export interface PopulatedCuratedBisLinkEntry extends CuratedBisLinkEntryBase {
  readonly populated: true;
  readonly sourceName: string;
  readonly sourceUrl: string;
  /** Patch this entry was last confirmed accurate for; compared against `CURRENT_PATCH`. */
  readonly patch: string;
  /** ISO date this entry was last confirmed accurate. */
  readonly lastUpdated: string;
}

export type CuratedBisLinkEntry = UnpopulatedCuratedBisLinkEntry | PopulatedCuratedBisLinkEntry;

/**
 * Real content: none populated yet -- every entry below is a placeholder. To fill one in, flip
 * `populated` to `true` and add the rest of PopulatedCuratedBisLinkEntry's fields. A job can have
 * more than one entry (one per BisContentType) -- for example, both of these could coexist:
 *
 * {
 *   job: 'Reaper',
 *   jobAliases: ['rpr'],
 *   contentType: BisContentType.SAVAGE,
 *   populated: true,
 *   sourceName: 'The Balance',
 *   sourceUrl: 'https://www.thebalanceffxiv.com/wiki/reaper/',  // verify before using
 *   patch: CURRENT_PATCH,
 *   lastUpdated: '2026-08-03',                 // the date you actually checked the link
 * },
 * {
 *   job: 'Reaper',
 *   jobAliases: ['rpr'],
 *   contentType: BisContentType.EXTREME,
 *   populated: true,
 *   sourceName: 'The Balance',
 *   sourceUrl: 'https://www.thebalanceffxiv.com/wiki/reaper/extreme/',
 *   patch: CURRENT_PATCH,
 *   lastUpdated: '2026-08-03',
 * },
 */
export const CURATED_BIS_LINKS: readonly CuratedBisLinkEntry[] = [
  // -- Tanks --
  { job: 'Paladin', jobAliases: ['pld'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Warrior', jobAliases: ['war'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Dark Knight', jobAliases: ['drk'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Gunbreaker', jobAliases: ['gnb'], contentType: BisContentType.SAVAGE, populated: false },

  // -- Healers --
  { job: 'White Mage', jobAliases: ['whm'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Scholar', jobAliases: ['sch'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Astrologian', jobAliases: ['ast'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Sage', jobAliases: ['sge'], contentType: BisContentType.SAVAGE, populated: false },

  // -- Melee DPS --
  { job: 'Monk', jobAliases: ['mnk'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Dragoon', jobAliases: ['drg'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Ninja', jobAliases: ['nin'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Samurai', jobAliases: ['sam'], contentType: BisContentType.SAVAGE, populated: false },
  // Demonstrates a job carrying more than one content-type entry -- both still unpopulated.
  { job: 'Reaper', jobAliases: ['rpr'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Reaper', jobAliases: ['rpr'], contentType: BisContentType.EXTREME, populated: false },
  { job: 'Viper', jobAliases: ['vpr'], contentType: BisContentType.SAVAGE, populated: false },

  // -- Physical Ranged DPS --
  { job: 'Bard', jobAliases: ['brd'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Machinist', jobAliases: ['mch'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Dancer', jobAliases: ['dnc'], contentType: BisContentType.SAVAGE, populated: false },

  // -- Magical Ranged DPS --
  { job: 'Black Mage', jobAliases: ['blm'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Summoner', jobAliases: ['smn'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Red Mage', jobAliases: ['rdm'], contentType: BisContentType.SAVAGE, populated: false },
  { job: 'Pictomancer', jobAliases: ['pct'], contentType: BisContentType.SAVAGE, populated: false },

  // -- Disciples of the Hand (crafters) --
  {
    job: 'Carpenter',
    jobAliases: ['crp'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Blacksmith',
    jobAliases: ['bsm'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Armorer',
    jobAliases: ['arm'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Goldsmith',
    jobAliases: ['gsm'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Leatherworker',
    jobAliases: ['ltw'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Weaver',
    jobAliases: ['wvr'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Alchemist',
    jobAliases: ['alc'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },
  {
    job: 'Culinarian',
    jobAliases: ['cul'],
    contentType: BisContentType.CRAFTING_GEAR,
    populated: false,
  },

  // -- Disciples of the Land (gatherers) --
  {
    job: 'Miner',
    jobAliases: ['min'],
    contentType: BisContentType.GATHERING_GEAR,
    populated: false,
  },
  {
    job: 'Botanist',
    jobAliases: ['btn'],
    contentType: BisContentType.GATHERING_GEAR,
    populated: false,
  },
  {
    job: 'Fisher',
    jobAliases: ['fsh'],
    contentType: BisContentType.GATHERING_GEAR,
    populated: false,
  },
];
