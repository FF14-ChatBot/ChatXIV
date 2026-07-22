/**
 * Types aligned with the boilmaster / XIVAPI v2 OpenAPI document (`api-1.json`).
 * Names use an `XivApi` prefix; JSDoc notes the matching `components/schemas/*` entry where applicable.
 */

/** OpenAPI: `SchemaLanguage` */
export const XivApiLanguage = {
  None: 'none',
  En: 'en',
  Ja: 'ja',
  De: 'de',
  Fr: 'fr',
  Chs: 'chs',
  Cht: 'cht',
  Kr: 'kr',
} as const;

export type XivApiLanguage = (typeof XivApiLanguage)[keyof typeof XivApiLanguage];

/** OpenAPI: `SchemaFormat` */
export const XivApiSchemaFormat = {
  Jpg: 'jpg',
  Png: 'png',
  Webp: 'webp',
} as const;

export type XivApiSchemaFormat = (typeof XivApiSchemaFormat)[keyof typeof XivApiSchemaFormat];

/** OpenAPI: `StatusCode` (HTTP status as uint16). */
export type XivApiStatusCode = number;

/** OpenAPI: `ErrorResponse` */
export interface XivApiErrorResponse {
  readonly code: XivApiStatusCode;
  readonly message: string;
}

/**
 * OpenAPI: `QueryString` — search clause grammar (see spec for operations and value types).
 */
export type XivApiQueryString = string;

/**
 * OpenAPI: `FilterString` — comma-separated field paths with optional `@decorator(...)` segments.
 */
export type XivApiFilterString = string;

/** OpenAPI: `SchemaSpecifier` — pattern `^.+(@.+)?$` */
export type XivApiSchemaSpecifier = string;

/** OpenAPI: `RowSpecifier` — pattern `^\d+(:\d+)?$` (main row, optional `:subrow`). */
export type XivApiRowSpecifier = string;

/** OpenAPI: `ValueString` — arbitrary JSON object of row field values. */
export type XivApiValueRecord = Record<string, unknown>;

// ── Version query (shared) ────────────────────────────────────────────────

/** OpenAPI: `VersionQueryParams` */
export interface XivApiVersionQueryParams {
  readonly version?: string;
}

// ── GET /asset ───────────────────────────────────────────────────────────

/** OpenAPI: `AssetQuery` */
export interface XivApiAssetQuery {
  readonly path: string;
  readonly format: XivApiSchemaFormat;
}

/** OpenAPI: `AssetQuery` & `version` query parameter on `GET /asset`. */
export interface XivApiAssetParams extends XivApiAssetQuery, XivApiVersionQueryParams {}

/** Successful asset responses are binary image bodies (`image/jpeg` | `image/png` | `image/webp`). */
export type XivApiAssetBody = Blob;

// ── GET /asset/map/{territory}/{index} ─────────────────────────────────────

/** OpenAPI: `MapPath` */
export interface XivApiMapPathParams {
  readonly territory: string;
  readonly index: string;
}

// ── GET /search ────────────────────────────────────────────────────────────

/** OpenAPI: `SearchQuery` */
export interface XivApiSearchQueryParams {
  readonly query?: XivApiQueryString;
  readonly sheets?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** OpenAPI: `RowReaderQuery` */
export interface XivApiRowReaderQueryParams {
  readonly language?: XivApiLanguage;
  readonly schema?: XivApiSchemaSpecifier;
  readonly fields?: XivApiFilterString;
  readonly transient?: XivApiFilterString;
}

/**
 * OpenAPI: `/search` query — `VersionQueryParams` & `SearchQuery` & `RowReaderQuery`.
 */
export interface XivApiSearchParams
  extends XivApiVersionQueryParams, XivApiSearchQueryParams, XivApiRowReaderQueryParams {}

/** OpenAPI: `SearchResult` */
export interface XivApiSearchResultEntry {
  readonly score: number;
  readonly sheet: string;
  readonly row_id: number;
  readonly subrow_id?: number | null;
  readonly fields: XivApiValueRecord;
  readonly transient?: XivApiValueRecord | null;
}

/** OpenAPI: `SearchResult` (alias). */
export type XivApiSearchResultItem = XivApiSearchResultEntry;

/** OpenAPI: `SearchResponse` */
export interface XivApiSearchResult {
  readonly next?: string | null;
  readonly results: readonly XivApiSearchResultEntry[];
  readonly schema: string;
  readonly version: string;
}

/** OpenAPI: `SearchResponse` (alias for callers who prefer the spec name). */
export type XivApiSearchResponse = XivApiSearchResult;

// ── GET /sheet ─────────────────────────────────────────────────────────────

/** OpenAPI: `/sheet` query — only `version`. */
export type XivApiListSheetsParams = XivApiVersionQueryParams;

/** OpenAPI: `SheetMetadata` */
export interface XivApiSheetMetadata {
  readonly name: string;
}

/** OpenAPI: `ListResponse` */
export interface XivApiListSheetsResponse {
  readonly sheets: readonly XivApiSheetMetadata[];
}

/** OpenAPI: `ListResponse` (alias). */
export type XivApiListResponse = XivApiListSheetsResponse;

// ── GET /sheet/{sheet} ─────────────────────────────────────────────────────

/** OpenAPI: `SheetPath` */
export interface XivApiSheetPathParams {
  readonly sheet: string;
}

/** OpenAPI: `SheetQuery` */
export interface XivApiSheetQueryParams {
  readonly rows?: string;
  readonly limit?: number;
  readonly after?: XivApiRowSpecifier | null;
}

/**
 * OpenAPI: `/sheet/{sheet}` query — `VersionQueryParams` & `SheetQuery` & `RowReaderQuery`.
 */
export interface XivApiSheetRowsParams
  extends XivApiVersionQueryParams, XivApiSheetQueryParams, XivApiRowReaderQueryParams {}

/** OpenAPI: `RowResult` */
export interface XivApiRowResult {
  readonly row_id: number;
  readonly subrow_id?: number | null;
  readonly fields: XivApiValueRecord;
  readonly transient?: XivApiValueRecord | null;
}

/** OpenAPI: `SheetResponse` */
export interface XivApiSheetResponse {
  readonly rows: readonly XivApiRowResult[];
  readonly schema: string;
  readonly version: string;
}

// ── GET /sheet/{sheet}/{row} ───────────────────────────────────────────────

/** OpenAPI: `RowPath` */
export interface XivApiRowPathParams {
  readonly sheet: string;
  readonly row: XivApiRowSpecifier;
}

/** OpenAPI: `RowReaderQuery` (same shape as query params on `/sheet/{sheet}/{row}`). */
export type XivApiRowParams = XivApiRowReaderQueryParams;

/** OpenAPI: `RowResponse` */
export interface XivApiRowResponse {
  readonly schema: string;
  readonly version: string;
  readonly row_id: number;
  readonly subrow_id?: number | null;
  readonly fields: XivApiValueRecord;
  readonly transient?: XivApiValueRecord | null;
}

// ── GET /version ───────────────────────────────────────────────────────────

/** OpenAPI: `VersionMetadata` */
export interface XivApiVersionMetadata {
  readonly key: string;
  readonly names: readonly string[];
}

/** OpenAPI: `VersionsResponse` */
export interface XivApiVersionsResponse {
  readonly versions: readonly XivApiVersionMetadata[];
}

// ── Client surface ─────────────────────────────────────────────────────────

export interface XivApiClient {
  getAsset(params: XivApiAssetParams): Promise<XivApiAssetBody>;
  getMapAsset(
    path: XivApiMapPathParams,
    params?: XivApiVersionQueryParams
  ): Promise<XivApiAssetBody>;
  search(params: XivApiSearchParams, signal?: AbortSignal): Promise<XivApiSearchResult>;
  listSheets(params?: XivApiListSheetsParams): Promise<XivApiListSheetsResponse>;
  listSheetRows(sheet: string, params?: XivApiSheetRowsParams): Promise<XivApiSheetResponse>;
  /** `row` may be a main id or a `main:subrow` specifier per `RowSpecifier`. */
  getRow(
    sheet: string,
    row: number | XivApiRowSpecifier,
    params?: XivApiRowParams
  ): Promise<XivApiRowResponse>;
  listVersions(): Promise<XivApiVersionsResponse>;
}
