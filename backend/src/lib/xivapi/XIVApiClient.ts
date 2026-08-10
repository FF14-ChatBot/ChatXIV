/**
 * XIVAPI v2 (boilmaster) HTTP client factory.
 *
 * Provides a thin wrapper around `RetryingHttpClient` for querying v2.xivapi.com game-data endpoints.
 * All outbound requests are throttled by a token-bucket rate limiter and guarded by a timeout.
 *
 * Retry, backoff, and error handling are delegated to the shared `RetryingHttpClient` base;
 * this module only owns URL construction and parameter mapping.
 *
 * XIVAPI v2 is open and requires no authentication.
 */

import type pino from 'pino';
import {
  RetryingHttpClient,
  type BeforeAttemptContext,
  type RequestOptions,
} from '../http/fetchWithRetry.js';
import type { TokenBucket } from '../http/tokenBucket.js';
import { TokenBucketQueueTimeoutError } from '../http/tokenBucket.js';
import { AppError } from '../errors/AppError.js';
import { XIVAPI_DATA_SOURCE } from '../config/constants.js';
import type {
  XivApiAssetBody,
  XivApiAssetParams,
  XivApiClient,
  XivApiListSheetsParams,
  XivApiListSheetsResponse,
  XivApiMapPathParams,
  XivApiRowParams,
  XivApiRowResponse,
  XivApiSearchParams,
  XivApiSearchResult,
  XivApiSheetResponse,
  XivApiSheetRowsParams,
  XivApiVersionQueryParams,
  XivApiVersionsResponse,
} from './types.js';

/** Configuration consumed by the client factory. */
export interface XivApiClientConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

const SOURCE_NAME = XIVAPI_DATA_SOURCE;

export class XivApiHttpClient extends RetryingHttpClient implements XivApiClient {
  private readonly log: pino.Logger;
  private readonly baseUrl: string;

  constructor(config: XivApiClientConfig, throttle: TokenBucket, log: pino.Logger) {
    super({
      timeoutMs: config.timeoutMs,
      sourceName: SOURCE_NAME,
      beforeAttempt: async (ctx: BeforeAttemptContext) => {
        try {
          // `consume()` itself measures queue-wait and calls `ctx.onQueueWait` only when this
          // attempt actually queued -- it's the one place that already knows which case applies.
          await throttle.consume(
            {
              url: ctx.url,
              ...(ctx.requestId !== undefined ? { requestId: ctx.requestId } : {}),
            },
            ctx.signal,
            ctx.onQueueWait
          );
        } catch (err) {
          // Normalize like `connect()`/`sleep()` already do for their own failure modes, so a
          // caller distinguishing failure types (e.g. `pickSourceUnavailableFailure`) doesn't
          // lose this specific diagnostic to a generic fallback only because it originated in
          // the rate limiter instead of the fetch itself.
          if (err instanceof TokenBucketQueueTimeoutError) {
            throw AppError.sourceUnavailable(`${SOURCE_NAME} rate limiter: ${err.message}`);
          }
          throw err;
        }
      },
    });
    this.baseUrl = config.baseUrl;
    this.log = log;
  }

  private buildUrl(path: string): URL {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    return new URL(path, base);
  }

  private setOptionalParam(url: URL, key: string, value: string | number | undefined): void {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  async getAsset(params: XivApiAssetParams): Promise<XivApiAssetBody> {
    const url = this.buildUrl('asset');
    url.searchParams.set('path', params.path);
    url.searchParams.set('format', params.format);
    this.setOptionalParam(url, 'version', params.version);
    return this.fetchBlob(url.toString(), this.log);
  }

  async getMapAsset(
    path: XivApiMapPathParams,
    params?: XivApiVersionQueryParams
  ): Promise<XivApiAssetBody> {
    const url = this.buildUrl(
      `asset/map/${encodeURIComponent(path.territory)}/${encodeURIComponent(path.index)}`
    );
    this.setOptionalParam(url, 'version', params?.version);
    return this.fetchBlob(url.toString(), this.log);
  }

  async search(params: XivApiSearchParams, options?: RequestOptions): Promise<XivApiSearchResult> {
    const url = this.buildUrl('search');
    this.setOptionalParam(url, 'version', params.version);
    this.setOptionalParam(url, 'query', params.query);
    this.setOptionalParam(url, 'sheets', params.sheets);
    this.setOptionalParam(url, 'cursor', params.cursor);
    this.setOptionalParam(url, 'limit', params.limit);
    this.setOptionalParam(url, 'language', params.language);
    this.setOptionalParam(url, 'schema', params.schema);
    this.setOptionalParam(url, 'fields', params.fields);
    this.setOptionalParam(url, 'transient', params.transient);

    return (await this.fetchJson(
      url.toString(),
      this.log,
      options?.signal,
      options?.onQueueWait
    )) as XivApiSearchResult;
  }

  async listSheets(params?: XivApiListSheetsParams): Promise<XivApiListSheetsResponse> {
    const url = this.buildUrl('sheet');
    this.setOptionalParam(url, 'version', params?.version);
    return (await this.fetchJson(url.toString(), this.log)) as XivApiListSheetsResponse;
  }

  async listSheetRows(sheet: string, params?: XivApiSheetRowsParams): Promise<XivApiSheetResponse> {
    const url = this.buildUrl(`sheet/${encodeURIComponent(sheet)}`);
    this.setOptionalParam(url, 'version', params?.version);
    this.setOptionalParam(url, 'rows', params?.rows);
    this.setOptionalParam(url, 'limit', params?.limit);
    if (params?.after !== undefined && params.after !== null) {
      url.searchParams.set('after', params.after);
    }
    this.setOptionalParam(url, 'language', params?.language);
    this.setOptionalParam(url, 'schema', params?.schema);
    this.setOptionalParam(url, 'fields', params?.fields);
    this.setOptionalParam(url, 'transient', params?.transient);
    return (await this.fetchJson(url.toString(), this.log)) as XivApiSheetResponse;
  }

  async getRow(
    sheet: string,
    row: number | string,
    params?: XivApiRowParams
  ): Promise<XivApiRowResponse> {
    const rowSeg = typeof row === 'number' ? String(row) : row;
    const url = this.buildUrl(`sheet/${encodeURIComponent(sheet)}/${encodeURIComponent(rowSeg)}`);
    this.setOptionalParam(url, 'language', params?.language);
    this.setOptionalParam(url, 'schema', params?.schema);
    this.setOptionalParam(url, 'fields', params?.fields);
    this.setOptionalParam(url, 'transient', params?.transient);

    return (await this.fetchJson(url.toString(), this.log)) as XivApiRowResponse;
  }

  async listVersions(): Promise<XivApiVersionsResponse> {
    const url = this.buildUrl('version');
    return (await this.fetchJson(url.toString(), this.log)) as XivApiVersionsResponse;
  }
}

/** Creates an `XivApiClient` backed by native `fetch`, a token-bucket throttle, and Pino logger. */
export function createXivApiClient(
  config: XivApiClientConfig,
  throttle: TokenBucket,
  log: pino.Logger
): XivApiClient {
  return new XivApiHttpClient(config, throttle, log);
}
