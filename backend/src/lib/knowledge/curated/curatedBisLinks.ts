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

interface CuratedBisLinkEntryBase {
  /** Canonical job name, e.g. "Reaper". */
  readonly job: string;
  /** Strings that identify this job in free text (abbreviations, casing variants). */
  readonly jobAliases: readonly string[];
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
  /**
   * What the guide covers, kept generic (e.g. "current Savage raid tier") rather than naming a
   * specific fight, so an entry doesn't need editing every time a new fight releases within the
   * same content type.
   */
  readonly content: string;
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
 * `populated` to `true` and add the rest of PopulatedCuratedBisLinkEntry's fields, e.g.:
 *
 * {
 *   job: 'Reaper',
 *   jobAliases: ['rpr', 'reaper'],
 *   populated: true,
 *   content: 'current Savage raid tier',       // or e.g. "current crafting gear" for a DoH job
 *   sourceName: 'The Balance',
 *   sourceUrl: 'https://www.thebalanceffxiv.com/wiki/reaper/',  // verify before using
 *   patch: CURRENT_PATCH,
 *   lastUpdated: '2026-08-03',                 // the date you actually checked the link
 * },
 */
export const CURATED_BIS_LINKS: readonly CuratedBisLinkEntry[] = [
  // -- Tanks --
  { job: 'Paladin', jobAliases: ['pld', 'paladin'], populated: false },
  { job: 'Warrior', jobAliases: ['war', 'warrior'], populated: false },
  { job: 'Dark Knight', jobAliases: ['drk', 'dark knight', 'dark.knight'], populated: false },
  { job: 'Gunbreaker', jobAliases: ['gnb', 'gunbreaker'], populated: false },

  // -- Healers --
  { job: 'White Mage', jobAliases: ['whm', 'white mage', 'white.mage'], populated: false },
  { job: 'Scholar', jobAliases: ['sch', 'scholar'], populated: false },
  { job: 'Astrologian', jobAliases: ['ast', 'astrologian'], populated: false },
  { job: 'Sage', jobAliases: ['sge', 'sage'], populated: false },

  // -- Melee DPS --
  { job: 'Monk', jobAliases: ['mnk', 'monk'], populated: false },
  { job: 'Dragoon', jobAliases: ['drg', 'dragoon'], populated: false },
  { job: 'Ninja', jobAliases: ['nin', 'ninja'], populated: false },
  { job: 'Samurai', jobAliases: ['sam', 'samurai'], populated: false },
  { job: 'Reaper', jobAliases: ['rpr', 'reaper'], populated: false },
  { job: 'Viper', jobAliases: ['vpr', 'viper'], populated: false },

  // -- Physical Ranged DPS --
  { job: 'Bard', jobAliases: ['brd', 'bard'], populated: false },
  { job: 'Machinist', jobAliases: ['mch', 'machinist'], populated: false },
  { job: 'Dancer', jobAliases: ['dnc', 'dancer'], populated: false },

  // -- Magical Ranged DPS --
  { job: 'Black Mage', jobAliases: ['blm', 'black mage', 'black.mage'], populated: false },
  { job: 'Summoner', jobAliases: ['smn', 'summoner'], populated: false },
  { job: 'Red Mage', jobAliases: ['rdm', 'red mage', 'red.mage'], populated: false },
  { job: 'Pictomancer', jobAliases: ['pct', 'pictomancer'], populated: false },

  // -- Disciples of the Hand (crafters) --
  { job: 'Carpenter', jobAliases: ['crp', 'carpenter'], populated: false },
  { job: 'Blacksmith', jobAliases: ['bsm', 'blacksmith'], populated: false },
  { job: 'Armorer', jobAliases: ['arm', 'armorer'], populated: false },
  { job: 'Goldsmith', jobAliases: ['gsm', 'goldsmith'], populated: false },
  { job: 'Leatherworker', jobAliases: ['ltw', 'leatherworker'], populated: false },
  { job: 'Weaver', jobAliases: ['wvr', 'weaver'], populated: false },
  { job: 'Alchemist', jobAliases: ['alc', 'alchemist'], populated: false },
  { job: 'Culinarian', jobAliases: ['cul', 'culinarian'], populated: false },

  // -- Disciples of the Land (gatherers) --
  { job: 'Miner', jobAliases: ['min', 'miner'], populated: false },
  { job: 'Botanist', jobAliases: ['btn', 'botanist'], populated: false },
  { job: 'Fisher', jobAliases: ['fsh', 'fisher'], populated: false },
];
