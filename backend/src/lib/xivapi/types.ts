/**
 * XIVAPI v2 (boilmaster) domain types and client interface.
 *
 * XIVAPI is an open, free REST API for FFXIV game data (items, quests, actions, etc.).
 * V2 docs: https://v2.xivapi.com/api/docs
 * Response types here are intentionally minimal (MVP); extend as endpoints are consumed.
 */

/** XIVAPI-supported language codes (TR-7: en, ja, de, fr). */
export const XivApiLanguage = {
  En: 'en',
  Ja: 'ja',
  De: 'de',
  Fr: 'fr',
} as const;

export type XivApiLanguage = (typeof XivApiLanguage)[keyof typeof XivApiLanguage];

/** Error envelope returned by all v2 endpoints on non-200 responses. */
export interface XivApiErrorResponse {
  readonly code: number;
  readonly message: string;
}

/** Parameters for `GET /search`. */
export interface XivApiSearchParams {
  /** Search query string (v2 query syntax). */
  readonly query?: string;
  /** Comma-separated sheet names to search (e.g. "Quest,Item"). */
  readonly sheets?: string;
  /** Cursor UUID for pagination (returned as `next` in a prior response). */
  readonly cursor?: string;
  readonly limit?: number;
  readonly language?: XivApiLanguage;
  /** Field filter for row data (dot notation, e.g. "Name,Icon"). */
  readonly fields?: string;
  /** Field filter for transient row data. */
  readonly transient?: string;
}

/** A single search hit from `GET /search`. */
export interface XivApiSearchResultEntry {
  readonly score: number;
  readonly sheet: string;
  readonly row_id: number;
  readonly subrow_id?: number;
  readonly fields: Record<string, unknown>;
  readonly transient?: Record<string, unknown>;
}

/** Response envelope from `GET /search`. */
export interface XivApiSearchResult {
  readonly next?: string;
  readonly results: readonly XivApiSearchResultEntry[];
  readonly schema: string;
  readonly version: string;
}

/** Optional parameters for `GET /sheet/{sheet}/{row}`. */
export interface XivApiRowParams {
  readonly language?: XivApiLanguage;
  readonly fields?: string;
  readonly transient?: string;
}

/** Response from `GET /sheet/{sheet}/{row}`. */
export interface XivApiRowResponse {
  readonly row_id: number;
  readonly subrow_id?: number;
  readonly fields: Record<string, unknown>;
  readonly transient?: Record<string, unknown>;
  readonly schema: string;
  readonly version: string;
}

/** Public contract for the XIVAPI v2 HTTP client. */
export interface XivApiClient {
  search(params: XivApiSearchParams): Promise<XivApiSearchResult>;
  getRow(sheet: string, row: number, params?: XivApiRowParams): Promise<XivApiRowResponse>;
}
