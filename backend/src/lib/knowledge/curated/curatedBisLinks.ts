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
 * Real content: none populated yet. Add real, checked links (flip to `populated: true`, fill in
 * the rest of PopulatedCuratedBisLinkEntry) before this resolver serves live traffic for a job.
 */
export const CURATED_BIS_LINKS: readonly CuratedBisLinkEntry[] = [
  { job: 'Reaper', jobAliases: ['rpr', 'reaper'], populated: false },
  { job: 'White Mage', jobAliases: ['whm', 'white mage', 'white.mage'], populated: false },
];
