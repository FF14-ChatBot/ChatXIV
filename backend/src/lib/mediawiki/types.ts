import type { MediaWikiWikiId } from '../config/constants.js';

/** Generic `action=query` params (e.g. `list`, `prop`, `titles`) — MediaWiki's query API is modular. */
export type MediaWikiQueryParams = Record<string, string>;

/** Generic `action=parse` params (e.g. `page`, `pageid`, `prop`). */
export type MediaWikiParseParams = Record<string, string>;

/** Raw `action=query`/`action=parse` JSON body; shape depends on the requested modules. */
export type MediaWikiApiResponse = Readonly<Record<string, unknown>>;

/** One `list=search` hit (`action=query&list=search`). */
export interface MediaWikiSearchResultEntry {
  readonly ns: number;
  readonly title: string;
  readonly pageid: number;
  readonly size: number;
  readonly wordcount: number;
  /** HTML snippet with `<span class="searchmatch">` around matched terms. */
  readonly snippet: string;
  readonly timestamp: string;
}

export interface MediaWikiSearchResponse {
  readonly query: {
    readonly search: readonly MediaWikiSearchResultEntry[];
    readonly searchinfo?: { readonly totalhits: number };
  };
  /** Present when more results exist; pass `sroffset` back in a follow-up `search` call. */
  readonly continue?: Readonly<Record<string, unknown>>;
}

export interface MediaWikiClient {
  query(wikiId: MediaWikiWikiId, params: MediaWikiQueryParams): Promise<MediaWikiApiResponse>;
  parse(wikiId: MediaWikiWikiId, params: MediaWikiParseParams): Promise<MediaWikiApiResponse>;
  search(
    wikiId: MediaWikiWikiId,
    srsearch: string,
    limit?: number
  ): Promise<MediaWikiSearchResponse>;
}
