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
export interface CuratedBisLinkEntry {
  /** Canonical job name, e.g. "Reaper". */
  readonly job: string;
  /** Strings that identify this job in free text (abbreviations, casing variants). */
  readonly jobAliases: readonly string[];
  /**
   * What the guide covers, kept generic (e.g. "current Savage raid tier") rather than naming a
   * specific fight, so an entry doesn't need editing every time a new fight releases within the
   * same content type.
   */
  readonly content: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly patchOrDate?: string;
  /** ISO date this entry was last confirmed to point somewhere accurate. */
  readonly lastUpdated: string;
}

/**
 * PLACEHOLDER DATA -- illustrative examples only, not verified real guidance or real URLs.
 * What this file/resolver pair delivers is the shape and matching behavior; populate real,
 * checked links before this resolver serves live traffic.
 */
export const CURATED_BIS_LINKS: readonly CuratedBisLinkEntry[] = [
  {
    job: 'Reaper',
    jobAliases: ['rpr', 'reaper'],
    content: 'current Savage raid tier',
    sourceName: 'The Balance (placeholder -- replace with the real current guide)',
    sourceUrl: 'https://example.com/replace-with-real-reaper-bis-guide',
    lastUpdated: '2026-08-03',
  },
  {
    job: 'White Mage',
    jobAliases: ['whm', 'white mage', 'white.mage'],
    content: 'current Savage raid tier',
    sourceName: 'The Balance (placeholder -- replace with the real current guide)',
    sourceUrl: 'https://example.com/replace-with-real-white-mage-bis-guide',
    lastUpdated: '2026-08-03',
  },
];
