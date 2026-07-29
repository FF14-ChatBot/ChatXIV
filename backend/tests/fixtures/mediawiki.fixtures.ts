/**
 * Realistic MediaWiki Action API response bodies (ConsoleGamesWiki / Fandom FFXIV shapes)
 * for use as dummy data in client and (future) resolver tests.
 */
import type { MediaWikiApiResponse, MediaWikiSearchResponse } from '@src/lib/mediawiki/types.js';

/** `action=query&list=search&srsearch=Potion` — unlocks/settings lookup. */
export const mediaWikiSearchResponseFixture: MediaWikiSearchResponse = {
  query: {
    searchinfo: { totalhits: 2 },
    search: [
      {
        ns: 0,
        title: 'Potion',
        pageid: 4212,
        size: 4821,
        wordcount: 612,
        snippet: 'A <span class="searchmatch">Potion</span> restores a small amount of HP.',
        timestamp: '2024-11-02T18:23:41Z',
      },
      {
        ns: 0,
        title: 'Hi-Potion',
        pageid: 4213,
        size: 5120,
        wordcount: 640,
        snippet: 'A <span class="searchmatch">Potion</span> variant with greater potency.',
        timestamp: '2024-11-02T18:24:05Z',
      },
    ],
  },
  continue: { sroffset: 2, continue: '-||' },
};

/** `action=query&prop=revisions&titles=Potion` — unlocks/settings guide content. */
export const mediaWikiQueryRevisionsResponseFixture: MediaWikiApiResponse = {
  batchcomplete: '',
  query: {
    pages: {
      '4212': {
        pageid: 4212,
        ns: 0,
        title: 'Potion',
        revisions: [
          {
            revid: 98765,
            parentid: 98764,
            timestamp: '2024-11-02T18:23:41Z',
            slots: {
              main: {
                contentmodel: 'wikitext',
                contentformat: 'text/x-wiki',
                '*': "'''Potion''' is a consumable item that restores a small amount of HP.",
              },
            },
          },
        ],
      },
    },
  },
};

/** `action=parse&page=Potion` — quest/story or item detail page. */
export const mediaWikiParseResponseFixture: MediaWikiApiResponse = {
  parse: {
    title: 'Potion',
    pageid: 4212,
    text: {
      '*': '<div class="mw-parser-output"><p><b>Potion</b> restores a small amount of HP.</p></div>',
    },
    categories: [{ '*': 'Items', sortkey: '' }],
  },
};

/**
 * `action=parse` for an unlock guide page with an infobox table above the prose — exercises
 * `MediaWikiResolver`'s table-stripping (the infobox's cell text must not leak into the chunk).
 */
export const mediaWikiParseResponseWithInfoboxFixture: MediaWikiApiResponse = {
  parse: {
    title: 'Palace of the Dead',
    pageid: 5310,
    text: {
      '*':
        '<div class="mw-parser-output">' +
        '<table class="infobox"><tbody>' +
        '<tr><th>Patch Added</th><td>3.35</td></tr>' +
        '<tr><th>Level</th><td>17</td></tr>' +
        '</tbody></table>' +
        '<p>The <b>Palace of the Dead</b> is a deep dungeon accessible from Quarrymill. ' +
        'Players unlock it by completing the quest &quot;Deep Dungeon Duty&quot; from an NPC ' +
        'in Quarrymill after reaching level 17. Once unlocked, the duty can be queued for via ' +
        'the Duty Finder under the Deep Dungeon category.</p>' +
        '</div>',
    },
    categories: [{ '*': 'Deep Dungeons', sortkey: '' }],
  },
};

/**
 * `action=parse` for a page whose infobox contains a NESTED `<table>` (e.g. a sub-table of
 * floor-by-floor unlock requirements) — exercises `stripTables`' depth-tracking rather than a
 * naive non-greedy regex, which stops at the first `</table>` (the inner one) and leaks the
 * outer table's own label/value text.
 */
export const mediaWikiParseResponseWithNestedTableFixture: MediaWikiApiResponse = {
  parse: {
    title: 'Heaven-on-High',
    pageid: 6120,
    text: {
      '*':
        '<div class="mw-parser-output">' +
        '<table class="infobox"><tbody>' +
        '<tr><th>Patch Added</th><td>' +
        '<table class="nested"><tr><td>sub-table cell</td></tr></table>' +
        'Leaked Infobox Label: Leaked Value' +
        '</td></tr>' +
        '</tbody></table>' +
        '<p>Heaven-on-High is a deep dungeon accessible from Kugane after completing the ' +
        'requisite quest.</p>' +
        '</div>',
    },
  },
};

/**
 * `action=parse` for a page whose markup includes a self-closing `<table/>` tag (a malformed or
 * unusually-generated template) between two prose sections — exercises `stripTables`' handling of
 * an "open" tag with no matching close: treated as an unmatched open rather than depth-neutral, it
 * would silently drop everything after the self-closing tag, including the real content below.
 */
export const mediaWikiParseResponseWithSelfClosingTableFixture: MediaWikiApiResponse = {
  parse: {
    title: 'Eureka Orthos',
    pageid: 7040,
    text: {
      '*':
        '<div class="mw-parser-output">' +
        '<p>Eureka Orthos is a deep dungeon accessible from Idyllshire.</p>' +
        '<table/>' +
        '<p>Players unlock it by completing the quest "Handful of Casualties" after reaching ' +
        'level 71, then queueing via the Duty Finder under the Deep Dungeon category.</p>' +
        '</div>',
    },
  },
};

/** `action=parse` for a stub/very short page — below `MIN_CONTENT_CHARS` once cleaned. */
export const mediaWikiParseResponseThinFixture: MediaWikiApiResponse = {
  parse: {
    title: 'Placeholder Unlock',
    pageid: 9001,
    text: {
      '*': '<div class="mw-parser-output"><p>Stub.</p></div>',
    },
  },
};
